---
layout: post
title: 大模型分布式训练 Distributed Data Parallel(DDP)的原理和实现
data: 2026-06-02
categories: Technique
---

## 引入

最近在做一个基于分割大模型 SAM3 的工作，需要学习了解 SAM3 原项目代码里的实现，因此将其中不熟悉的技术分节整理出来作为笔记，以便以后学习使用。

SAM3 的参数量为 ~850M，加上训练数据量巨大，提出的 SA-Co 数据集包含 120K 张图片、 1.7K 段视频和 207K 个不同的语义概念。因此训练需要多张 GPU 来进行同步训练。

在 SAM3 的官方代码实现中，提供了**分布式数据并行(Distributed Data Parallel, DDP)**的实现，该博客对该技术做一个总结记录。

## 分布式数据并行(DDP)的原理

DDP 是使用多张显卡来同时训练大模型，一方面可以避免显存不足的问题，另一方面可以加快训练的速度。其核心思想是在多张显卡上都**复制一份模型**，然后在训练时将**数据集均分成多份**，分别分配给不同显卡用于训练。

这么做会导致不同显卡使用的训练数据不一致，那么计算的损失值和更新的梯度方向该以谁为准？直觉上（也是实际上）是**计算所有显卡梯度的均值**作为最终更新梯度方向，所有显卡都将按照该梯度值进行更新，因此所有显卡的模型权重始终保持一致，以此来实现模型在多张显卡上同步训练的效果。

DDP 可以等价于单卡训练。具体来说，在单卡上设置 Batch=128 进行训练和在4张显卡上设置 Batch=32 进行训练，在数学上基本等价。但是 DDP 也有局限性，在面对参数巨大的模型时，在每张显卡上都要复制一份模型可能无法实现或是浪费空间。因此有 Fully Shareded Data Parallel 和 Zero Redundancy Optimizer这种将模型参数、梯度和优化器都分片的分布训练方法。

## DDP 的实现——基于Pytorch实现

参考官方文档：[Distributed Data Parallel](https://docs.pytorch.org/docs/2.12/notes/ddp.html#distributed-data-parallel) [[中文文档](https://docs.pytorch.ac.cn/docs/stable/notes/ddp.html#implementation)]。

首先要创建通信组`ProcessGroup`实例，让GPU之间实现进程通信：
```python
import torch.distributed as dist
from datetime import timedelta

dist.init_process_group(
    backend="nccl",              # 通信后端（nccl/gloo等）*
    init_method="env://",        # 初始化方式,从环境变量读取 MASTER_ADDR、MASTER_PORT、RANK、WORLD_SIZE
    timeout=timedelta(minutes=30), # 初始化超时时间 *
    world_size=8,                # 总进程数
    rank=0,                      # 当前进程编号
    store=None,                  # 底层共享存储
    group_name="",               # 进程组名称（较少使用）
    pg_options=None,             # 后端高级配置
    device_id=None               # 当前进程对应设备
)
```

然后使用`torch.nn.parallel.DistributedDataParellel`来封装模型即可直接用于训练：
```python
from torch.nn.parallel import DistributedDataParallel as DDP

model = DDP(
    module=model,                    # 待训练模型 *
    device_ids=[local_rank],         # 当前进程使用的GPU *
    output_device=local_rank,        # 输出所在GPU
    dim=0,                           # 数据划分维度
    broadcast_buffers=True,          # 同步Buffer
    process_group=None,              # 使用的通信组
    bucket_cap_mb=None,              # 梯度桶大小(MB)
    find_unused_parameters=False,    # 检测未参与反传的参数 *
    check_reduction=False,           # 旧版调试参数
    gradient_as_bucket_view=False,   # 梯度共享Bucket内存 *
    static_graph=False,              # 图结构是否固定 *
    delay_all_reduce_named_params=None,  # 延迟梯度同步
    param_to_hook_all_reduce=None,       # 指定同步参数
    mixed_precision=None,                # 混合精度配置
    device_mesh=None,                    # DeviceMesh配置
    skip_all_reduce_unused_params=False  # 跳过未使用参数同步
)
```

DDP构造函数接收了模型的引用，并从 rank 为 0 的进程向所有其他进程广播`state_dict()`，来让所有 GPU 从相同的模型状态开始训练。然后，每个进程还会创建一个本地 `Reducer`负责在反向传播期间的梯度同步。

---

在上述实现中有一些概念需要补充：

**首先**是关于 **Bucket** 的概念。现在已经知道 GPU 之间会发生通信来同步模型参数更新，但什么时候发起通信合适？如果要等模型将损失值返回计算完所有参数的梯度后再更新会造成资源浪费，具体来说，GPU 在计算梯度时，通信处于空闲；而当通信开始时，GPU 则处于空闲。因此实现中会`Reducer`**会将模型的参数打包成多个 bucket** ，可以设置 bucket 的大小。在训练过程中，当所有显卡模型的 bucket1 部分都完成梯度计算后，则开启通信更新所有模型的 bucket1 部分的参数。这样就可以达成通信和梯度计算同步进行。
<img src="https://user-images.githubusercontent.com/16999635/72401724-d296d880-371a-11ea-90ab-737f86543df9.png" width=900 alt="Bucket划分示意图">

**第二**是如何及时知道并获得模型参数的返回梯度值？`Reducer`会给各个参数注册`Hook`来获取模型运行时的中间层状态。`Hook`是一种“在特定时刻自动执行自定义代码”的机制，常常用于获取模型运行时的中间层特征、梯度，甚至是修改梯度。`Hook`类型有以下几类：

- `register_forward_hook()`：在模块forward完成之后执行，用于获取中间特征值或激活值。
- `register_forward_pre_hook()`：在模块forward之前执行，用于检查或修改输入。
- `register_full_backward_hook()`：在模块backward完成后执行，用于获取梯度。
- `register_hook()`：注册对象是 Tensor，当目标 Tensor 的梯度计算出来时执行，可用于修改梯度。

以下是使用示例：

```python
import torch
import torch.nn as nn

model = nn.Linear(4, 2)

# forward hook
def f_hook(m, i, o):
    print("forward:", o)

# backward hook
def b_hook(m, gi, go):
    print("backward:", go)

model.register_forward_hook(f_hook)
model.register_full_backward_hook(b_hook)

x = torch.randn(1, 4, requires_grad=True)

y = model(x)

# tensor hook
y.register_hook(lambda g: print("tensor grad:", g))

loss = y.sum()
loss.backward()
```

**第三**是关于 DDP 的参数`find_unused_parameters`。当该参数设为`True`时，DDP 会分析本地模型并遍历 autograd 图，判断模型中哪些参数没有参与 Forward 计算，这样`Reducer`就不用等待这些没被使用的参数的梯度，避免出现卡死。这种判断会引入额外的开销，因此只有当模型中存在分支时才会开启（例如MoE）。

以上为目前整理笔记，后续可能会继续补充。