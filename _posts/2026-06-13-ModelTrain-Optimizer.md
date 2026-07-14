---
layout: post
title: 模型训练——优化器
date: 2026-06-13
section: note
categories: ModelTrain
math: true
---

## 引入

在模型训练时，基本的思路是将数据输入给模型，获得模型的输出值，然后将输出值与数据的真实标签值做损失值计算，再由损失值做反向传播，计算每个参数应该更新的方向，即梯度，最后根据**梯度**与**学习率**更新模型的所有参数。在这一过程中，存在诸多细节问题，例如模型参数容易陷入局部最优问题、固定学习率效果不够好，而动态学习率该如何调整等。接下来会介绍几个常见的优化方法，并介绍基于 Pytorch 实现的优化器使用。



## 随机梯度下降和动量引入

随机梯度下降（Stochastic Gradient Descent）是最基础的优化器，此处的 “随机” 是指在更新参数时，不是使用全部训练数据来计算梯度，而是随机抽取部分样本来近似整体梯度。在具体实现中，是将原始数据划分成多个批次（batches），每次处理一批数据并计算该数据对应的梯度来更新，而每处理完一个轮次（epoch），下一轮次的批次划分会不同于上一次，以此来实现随机。这么做一方面每次更新梯度不用计算全部数据，在增加参数更新频率的同时不用增加计算量；另一方面，这种小批次的梯度会包含一定 “噪声” ，而这个噪声有时能帮助模型参数跳出局部极小值。参数更新公式：

$$
\theta_{t+1} = \theta_t - \eta g_t
$$

为了进一步让模型参数更新更加稳定，同时缓解模型参数陷入局部最优的问题，引入了**动量**的概念，即在模型更新时引入额外的值，使模型朝目标方向更新更进一步，而这个额外的值实际上是由先前计算出的梯度所得，具体公式：

$$
v_t= \beta v_{t-1} + (1 - \beta)g_t \\
\theta_{t+1} = \theta_t - \eta v_t
$$

其中 $\beta$ 是动量系数，表示 “历史梯度的保留程度” 。动量的引入本质上是**为模型参数的更新信号做了低通滤波**，让参数更新的方向和步幅减少震荡。举个极端例子，例如当前计算的梯度方向和上一次计算梯度方向完全相反，若没有引入动量，则两次更新方向差距巨大；若引入了动量，由于会加上“历史梯度”，因此当前更新的方向会相对于上一次更新方向往相反方向偏移一些，但不至于完全相反，这么做能让更新变得更加稳定平滑。



## 动态更新梯度的引入：AdaGrad 和 RMSProp

在模型训练时，不同参数之间的梯度大小差距可能很大，为了让训练更加稳定，我们期望梯度经常较大的参数更新的步幅小一点，而梯度经常很小的参数更新的步幅大一点。因此我们希望能有一个动态调整更新梯度的机制。



最开始引入动态更新梯度的是 **AdaGrad** ，该方法对应的公式：

$$
v_t = v_{t-1} + g_i^2 \\
\theta_{t+1} = \theta_t - \frac{\eta}{\sqrt{v_t + \epsilon}} g_t
$$

随着历史梯度的累积，更新步幅会逐渐减小，但由此也能看出存在问题：随着历史梯度累积越来越多，当前的更新步幅越来越小，导致模型参数不再改变。因此有了改进方法 **Root Mean Square Propagation(RMSProp)** ，其对应公式：

$$
v_t = \beta v_{t-1} + (1 - \beta)g_t^2 \\
\theta_{t+1} = \theta_{t} - \frac{\eta}{\sqrt{v_t + \epsilon}} g_t
$$

此时历史梯度不再增长过快，从而避免参数无法更新的问题。



## 动量与动态学习率的结合：Adam 和 AdamW

**Adam** 优化方法集二者所长，其计算公式：

$$
m_t = \beta_1 m_{t-1} + (1-\beta_1)g_t \\
v_t = \beta_2 v_{t-1} + (1-\beta_2)g_t^2 \\
\theta_{t+1} = \theta_t - \frac{\eta}{\sqrt{v_t + \epsilon}}m_t
$$

在训练过程中，我们会期望模型参数在拟合的同时，尽量让参数小一点，从而让模型对输入数据不那么敏感。为了满足这一点，在计算损失值时会引入额外的正则项，即权重大小：

$$
L' = L + \lambda \sum ||\theta||^2
$$

在 **Adam** 中，该正则项会参与到梯度计算中，即 $g_t$ 是由损失值和正则项共同求导得到的，意味着正则项参与到了 $m_t$ 和 $v_t$ 的计算中，这会导致该正则项失去了其几何意义，让其依赖于历史梯度。



在 **AdamW** 中，会避免该问题，具体做法是不让正则项参与梯度的计算，而是在更新参数时再引入权重衰减，公式如下：

$$
\theta_{t+1} = \theta_t - \frac{\eta}{\sqrt{v_t + \epsilon}}m_t - \eta \lambda \theta_t
$$

目前 AdamW 一般作为默认优化器来进行训练。



## Pytorch中的优化器使用

在 Pytorch 中已经提供了 SGD、Adagrad、RMSProp、Adam、AdamW 等算法的实现，通过 `torch.optim` 进行调用。



此处主要介绍一下定义得到的 Optimizer 的 `state_dict()` 中存放了什么信息。在有时训练过程中需要保存 `checkpoint` ，方便接着训练而非从头开始。在前面对优化方法的介绍中可知，一些优化器会对每个参数记录“历史信息”，例如 Adam 需要记录每个参数的一阶动量 $m_t$ 和二阶动量 $v_t$ 。因此在保存 `checkpoint` 时，不仅需要保存 `model.state_dict()`  ，也需要保存 `Optimizer.state_dict()`。



Optimizer 的 `state_dict()` 是一个嵌套字典，包含了一个名为 `state` 的字典和一个名为 `param_groups` 的列表：

```python
# optim.state_dict()包含的数据信息
{
    "state": {
        0: {
           "exp_avg": tensor(...),
           "exp_avg_sp": tensor(...),
            ...
        }
        ...
    },
    "param_groups": [
        {
           "lr": ...,
           "weight_decay": ...,
           "params": [0, ...],
           "param_names": [...], # 和 params 大小相同，一一对应
            ...
        }, 
        ...
    ]
}
```

`param_groups` 的每个元素存放的是参数索引 `params` 、参数名称 `param_names` 以及这些参数对应的学习率和权重衰减值 $\lambda$。因为在传递给优化器模型参数时，是可以传递模型中不同部分的参数，然后分别设置不同的学习率等超参数。如果只传递整个模型参数，`param_groups`也就只包含一个元素。



`state` 则是参数索引为 $key$ ， $value$ 则是对应参数的”历史信息“，对于 Adam 就会存放一阶动量、二阶动量等信息。



根据 `optim.state_dict()` 存放的信息，可以实现”根据存储的优化器状态字典中的参数命名来指定加载到新优化器的对应参数中“。官方给了一套实现例子，需要使用 `register_load_state_dict_pre_hook()` 来使其在导入时运行：

```python
def adapt_state_dict_ids(optimizer, state_dict):
    # optimizer 是新定义的优化器， state_dict 是导入的旧优化器的设置数据
    
    # 将 param_groups 中的通用参数(学习率、权重衰减等)先复制到新优化器中
    adapted_state_dict = deepcopy(optimizer.state_dict())
    for k, v in state_dict['param_groups'][0].items():
        if k not in ['params', 'param_names']:
            adapted_state_dict['param_groups'][0][k] = v

    # 定义新优化器中参数名称与旧优化器中参数名称的一一对应关系
    lookup_dict = {
        'fc1.weight': 'fc.weight',
        'fc1.bias': 'fc.bias',
        'fc2.weight': 'fc.weight',
        'fc2.bias': 'fc.bias'
    }
    
    # 自定义字典复制函数
    clone_deepcopy = lambda d: {k: (v.clone() if isinstance(v, torch.Tensor) else deepcopy(v)) for k, v in d.items()}
    
    # 遍历新优化器中的参数索引，找到其对应的旧优化器 state 中的参数设置，并复制
    for param_id, param_name in zip(
            optimizer.state_dict()['param_groups'][0]['params'],
            optimizer.state_dict()['param_groups'][0]['param_names']):
        name_in_loaded = lookup_dict[param_name]
        index_in_loaded_list = state_dict['param_groups'][0]['param_names'].index(name_in_loaded)
        id_in_loaded = state_dict['param_groups'][0]['params'][index_in_loaded_list]
        if id_in_loaded in state_dict['state']:
            adapted_state_dict['state'][param_id] = clone_deepcopy(state_dict['state'][id_in_loaded])

    return adapted_state_dict

optimizer2.register_load_state_dict_pre_hook(adapt_state_dict_ids)
optimizer2.load_state_dict(torch.load(PATH)) # The previous optimizer saved state_dict
```



### 权重平均方法 SWA 和 EMA

在[官方文档](https://docs.pytorch.org/docs/2.12/optim.html#putting-it-all-together-ema)([中文版](https://docs.pytorch.ac.cn/docs/2.12/optim.html))中还介绍了权重平均方法的实现 `torch.optim.swa_utils.AveragedModel`，因为不一定会用，简单学习了一下，在此做个记录。



模型训练到后期，一些参数可能已经达到较优的值，但是由于还在训练，参数仍然会更新，此时参数会在最优点周围振荡，**最后保存的参数可能振荡到一个相对较差的位置**。为了让最后得到的参数获得更好的泛化能力和稳定的结果，可以考虑**综合多步训练的参数结果来计算得到最优参数**，而非保留训练的最后一步的结果参数。



Stochastic Weight Averaging (SWA) 的思想是指定后期多步的参数训练结果，计算它们的平均值作为最后结果。官方实现例子：

```python
loader, optimizer, model, loss_fn = ...
# 定义额外模型用于记录训练中的参数结果
swa_model = torch.optim.swa_utils.AveragedModel(model)
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=300)
swa_start = 160 # 从 160 epoch开始记录参数
# 应用于开始记录SWA时模型的学习率调整策略，因为最后要取多步参数平均，
# 因此希望学习率大一点，让多步参数之间足够多样，在取平均时更有效果
swa_scheduler = SWALR(optimizer, swa_lr=0.05)
for epoch in range(300):
      for input, target in loader:
          optimizer.zero_grad()
          loss_fn(model(input), target).backward()
          optimizer.step()
      if epoch > swa_start:
          swa_model.update_parameters(model) # 每个 epoch 后更新一次
          swa_scheduler.step()
      else:
          scheduler.step()
            
# Update bn statistics for the swa_model at the end
torch.optim.swa_utils.update_bn(loader, swa_model)
# Use swa_model to make predictions on test data
preds = swa_model(test_input)
```



Exponential Moving Average (EMA) 则是通过指数滑动平均得到结果参数，类似动量计算：

$$
W'_t = \alpha W'_{t-1} + (1-\alpha)W_t
$$

```python
loader, optimizer, model, loss_fn = ...
# 与 SWA 不同的是在定义额外模型时引入额外参数 multi_avg_fn
ema_model = torch.optim.swa_utils.AveragedModel(model, \
            multi_avg_fn=torch.optim.swa_utils.get_ema_multi_avg_fn(0.999))
for epoch in range(300):
      for input, target in loader:
          optimizer.zero_grad()
          loss_fn(model(input), target).backward()
          optimizer.step()
          ema_model.update_parameters(model) # 每个 step 后更新一次
            
# Update bn statistics for the ema_model at the end
torch.optim.swa_utils.update_bn(loader, ema_model)
# Use ema_model to make predictions on test data
preds = ema_model(test_input)
```

EMA 不同于 SWA 是在每个 epoch 时更新，这是因为 EMA 需要跟踪当前模型的平滑版本，如果也按照 epoch 频率更新，会相对于当前模型有较大的滞后，和当前模型参数的差距会变大。



两个方法最后都会调用 `torch.optim.swa_utils.update_bn()` 。这是为了应对模型中的 BatchNorm 操作，首先要说明模型中的 BatchNorm 层也包含了可训练参数 $\gamma$ 和 $\beta$ ，这是因为常规批标准化后数据会变成以均值为 0 ，方差为 1 的固定分布，这会限制模型的表达能力，因此使用 $\gamma x + \beta$ 来让模型学习决定合适的均值和方差。除此之外，BatchNorm 中还要记录 $running\_mean$ 和 $running\_var$，用于在模型推理时进行标准化，因为在推理阶段不会输入一批数据，无法计算均值方差用于标准化。`torch.optim.swa_utils.update_bn()` **会重新跑一遍数据集并更新 BatchNorm 中的  $running\_mean$ 和 $running\_var$ ，因为这两个值不能通过平均来计算。**

