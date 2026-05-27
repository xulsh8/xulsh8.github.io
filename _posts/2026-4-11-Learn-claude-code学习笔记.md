---
title: "Learn-claude-code学习笔记"
excerpt: "Agent搭建笔记"
categories:
  - Review Note
---

## Learn-claude-code学习笔记

本文是根据GitHub的Agent教程[Learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)学习路线学习整理而成的笔记。主要用于练习每一章节的关键点和对应的代码复现。



### 01: The Agent Loop

本章节旨在搭建一个最小可运行agent loop。整个过程可以抽象为：
$$
接收用户问题→[模型思考→调用可用工具→调用结果返回给模型→模型再思考]→返回用户答案
$$

~~~python
if __name__ == "__main__":
    history = [] # 存储整个用户与模型交互产生的文本信息
    # 每次循环表示一次用户输入
    while True:
    # 接收用户输入
    	try:
            query = input("\033[36ms01 >> \033[0m") # \033[36m控制文本颜色；\033[0m重置文本颜色
        except(EOFError, KeyboardInterrupt):
            break
        if query.strip().lower() in ("q", "exit", ""):
            break
            
        history.append({"role": "user", "content": query})
        state = LoopState(messages=history)
        
        # 每次循环表示一个agent loop
        while True:
            # 定义模型并传入问题，导入可用工具集
            response = client.messages.create(
                model=MODEL,
                system=SYSTEM,
                messages=state.messages,
                tools=TOOLS, # 用于定义模型可用工具集，包含变量name、description和定义调用格式的input_schema
                max_tokens=8000,
            )

            # 存储模型调用工具后的返回结果
            state.messages.append({"role": "assistant", "content": response.content})
            
            # 如果模型不是因为要调用工具才停止推理，则直接退出agent loop
            if response.stop_reason != "tool_use":
                state.transition_reason = None
                break
                
            # 根据模型推理调用对应工具
            results = execute_tool_calls(response.content)
            # 若调用工具无结果返回（调用故障？），则直接退出agent loop
            if not results:
                state.transition_reason = None
                break
        	
            state.messages.append({"role": "user", "content": results})
            state.turn_count += 1
            state.transition_reason = "tool_result"
        
        final_text = extract_text(history[-1]["content"])
        if final_text:
            print(finel_text)
        print()
~~~

#### 工具集定义

模型可调用的工具集通过`tools`参数传入`Anthropic.messages.create`，以**bash工具**为例，如何让模型知道它可以调用命令行工具。



和模型之间是通过**JSON格式**来规范交流结构化数据。工具集的定义如下：

~~~python
TOOLS = {
    "name": "bash", # 工具名称
    "description": "Run a shell command in the current workspace.", # 工具描述，描述越准确模型调用越准
    # 定义工具的输入参数
    "input_schema": {
        "type": "object",
        # 参数定义，其中每个参数还可以包含description,取值范围enum,默认值default等
        "properties": {"command": {"type": "string"}}, 
        "required": ["command"], # 必填参数
    }
}
~~~

在模型思考输出后，同样将模型的输出结果以**JSON格式**返回，具体格式如下：

~~~python
{
  "id": "msg_xxx", # 用来记录这是模型哪一次返回
  "type": "message",
  "role": "assistant",
  # 模型输出内容，分成多个blocks，每个block会被封装成对象，而非dict，因此可以用.来进行访问
  "content": [
    {
      "type": "tool_use", # 该block的类型
      "id": "toolu_123",
      "name": "get_weather",
      "input": {
        "location": "Singapore",
        "unit": "celsius"
      }
    }
  ]
}
~~~

#### 工具调用

在agent loop中直接使用函数`execute_tool_calls()`来调用工具，具体实现如下：

~~~python
def execute_tool_calls(response_content) -> List[dict]:
    results = []
    for block in response_content:
        if block.type != "tool_use":
            continue
        command = block.input["command"]
        print(f"\033[33m$ {command}\033[0m")
        
        output = run_bash(command)
        
        print(output[:200])
        results.append({
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": output,
        })
    return results
~~~



### 02: Tool Use

在**01: The Agent Loop**中展示了调用工具的简单实现，但仍然有待进一步扩展，首先是**确保调用工具时访问的路径必须在工作区内**，避免访问了未知区域的文件。其次是**设计一个工具映射表**，方便添删工具。另外，在传递给API的`messages`需要进行**规范化**。

#### 工作路径检查

为了确保模型只能访问工作区内的文件，在调用一些通过路径访问文件的工具时，需要对路径进行检查。例如：

~~~python
from pathlib import Path
def safe_path(p: str) -> Path:
    path = (WORKDIR / p).resolve() # / 表示连接两个路径，resolve()用于将相对路径转为绝对路径
    if not path.is_relative_to(WORKDIR):
        raise ValueError(f"Path escapes workspace: {p}")
    return path

# 用于读文件的工具
def run_read(path: str, limir: int = None) -> str:
    text = safe_path(path).read_text() # 读入路径文件所有内容
    lines = text.splitlines() # 将读入内容按照行分割成list
    if limit and limit < len(lines):
        lines = lines[:limit]
    return "\n".join(lines)[:50000] # 合并lines，并使用"\n"来间隔各个line
~~~

#### 工具映射表创建

在**01: The Agent Loop**中，`execute_tool_calls`函数只用于调用`bash`工具，若要添加新工具则要修改该函数，为了方便添删工具，可以让该函数通过`handler`来调用工具，类似指针。例如：

```python
# 工具映射表的创建
# 将key和匿名函数绑定，其中**kw表示将输入参数打包转为dict
TOOL_HANDLERS = {
    "bash": lambda **kw: run_bash(kw["command"]),
    "read_file": lambda **kw: run_read(kw["path"], kw.get("limit")),
    "edit_file": lambda **kw: run_edit(kw["path"], kw["old_text"], kw["new_text"]),
}

# 工具调用函数
def execute_tool_calls(response_content) -> List[dict]:
    results = []
    for block in response_content:
        if block.type == "tool_use":
            handler = TOOL_HANDLERS.get(block.name)
            # **block.input是指将block.input字典中拆散成参数传递：key=value
            output = handler(**block.input) if handler else f"Unknown tool: {block.name}"
            print(f"> {block.name}:")
            print(output[:200])
            results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})
    return results
```

#### 消息规范化

当系统复杂后 (工具超时、用户取消、压缩替换)，内部消息列表会出现 API 不接受的格式问题。需要在发送前做一次规范化。主要包括三条约束：

- 每个`tool_use`块必须有对应匹配的`tool_result`，二者通过`tool_use_id`关联。
- `user`/`assistant`消息必须严格交替。
- 只接收协议定义的字段，因此要过滤掉一些无法判断的数据。

```python
def normalize_messages(messages: list) -> list:
    normalized = []
    
    # Step1: 过滤内部无法判断的字段
    for msg in messages:
        clean = {"role": msg["role"]}
        if isinstance(msg.get("content"), str):
            clean["content"] = msg["content"]
        elif isinstance(msg.get("content"), list):
            clean["content"] = {
                k: v for k, v in block.items() 
                if k not in ("_internal", "_source", "_timestamp")
                for block in msg["content"]
            }
        normalized.append(clean)   
    
    # Step2: 确保tool_use和tool_result一一对应
    existing_results = set()
    for msg in normalized:
        if isinstance(msg.get("content"), list):
            for block in msg["content"]:
                if block.get("type") == "tool_result":
                    existing_results.add(block.get("tool_use_id"))
    
    for msg in normalized:
        if msg["role"] == "assistant" and isinstance(msg.get("content"), list):
            for block in msg["content"]:
                if (block.get("type") == "tool_use" 
                    and block.get("id") not in existing_results):
                    # 对于缺少对应结果的工具调用，进行补充
                    normalized.append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": block["id"],
                            "content": "(cancelled)",
                        }]
                    })
    
    # Step3: 确保user/assistant交替，合并相邻且相同的message
    merged = [normalized[0]] if normalized else []
    for msg in normalized[1:]:
        if msg["role"] == merged[-1]["role"]:
            prev = merged[-1]
            prev_content = prev["content"] if isinstance(prev["content"], list) \ 
            else [{"type": "text", "text": prev["content"]}]
            curr_content = msg["content"] if isinstance(msg["content"], list) \ 
            else [{"type": "text", "text": msg["content"]}]
            prev["content"] = prev_content + curr_content
        else:
            merged.append(msg)
            
    return merged
```

在 agent loop 中, 每次 API 调用前运行:

~~~python
response = client.messages.create(
    model=MODEL, system=system,
    messages=normalize_messages(messages),  # 规范化后再发送
    tools=TOOLS, max_tokens=8000,
)
~~~

### 03: TodoWrite

多步任务中, 模型会丢失进度 -- 重复做过的事、跳步、跑偏。对话越长越严重: 工具结果不断填满上下文, 系统提示的影响力逐渐被稀释。一个 10 步重构可能做完 1-3 步就开始即兴发挥, 因为 4-10 步已经被挤出注意力了。



具体做法是先通过`SYSTEM`告知模型利用`todo`工具设计一个多步骤计划表，因此这份计划表也是通过`tool_result`的形式来让模型知晓的。另外，为了让模型能够定期更新计划表，在返回`tool_result`给模型的同时，可以定期插入提醒文本。整体关键实现如下：

~~~python
# Step0: 工具定义
# input_schema是告诉模型该工具的输入参数格式，在这个例子中，调用该工具需要传入一个object(类似Python的dict)
# 其中dict只包含一个key，即items，该参数是一个array，array中的每个元素则包含id，text和status
TOOLS = [
    # ...base tools...
    {"name": "todo", "description": "Update task list. Track progress on multi-step tasks.",
     "input_schema": 
     {"type": "object", "properties": {
         "items": {"type": "array", 
                   "items": {"type": "object", "properties": {
                       "id": {"type": "string"}, 
                       "text": {"type": "string"}, 
                       "status": {"type": "string", "enum": ["pending", "in_progress", "completed"]}},
                             "required": ["id", "text", "status"]}}}, "required": ["items"]}},
]

# Step1: 设计一个用于记录计划表项目且可更新的类 TodoManager
class TodoManager:
    def __init__(self):
        self.items = []
    def update(self, items: list) -> str:
        # 设置计划条目最大值
        if len(items) > 20:
            return ValueError("Max 20 todos allowed")
        validated = []
        in_progress_count = 0
        # 逐条目检查有效取值，并记录in_progress数目
        for i, item in enumerate(items):
            text = str(item.get("text", "")).strip()
            status = str(item.get("status", "pending")).lower()
            item_id = str(item.get("id", str(i + 1)))
            if not text:
                raise ValueError(f"Item {item_id}: text required")
            if status not in ("pending", "in_progress", "completed"):
                raise ValueError(f"Item {item_id}: invalid status '{status}'")
            if status == "in_progress":
                in_progress_count += 1
            validated.append({"id": item_id, "text": text, "status": status})
        if in_progress_count > 1:
            raise ValueError("Only one task can be in_progress at a time")
        self.items = validated
        return self.render()
    
    def render(self) -> str:
        # 将计划表项目整理成给模型看的格式
        if not self.items:
            return "No todos."
        lines = []
        for item in self.items:
            marker = {"pending": "[ ]", "in_progress": "[>]", "completed": "[x]"}[item["status"]]
            lines.append(f"{marker} #item{item["id"]}: {item["text"]}")
        done = sum(1 for t in self.items if t["status"] == "completed")
        lines.append(f"\n({done}/{len(self.items)} completed)")
        return "\n".join(lines)
    
# Step2: 更新TOOL_HANDLERS，模型调用的就是TodoManager.update
TOOL_HANDLER = {
    # ...base tools...
    "todo": lambda **kw: TODO.update(kw["items"]),
}

#Step3: 为了定期提醒模型更新计划表，需要统计计划表未更新次数，即todo工具有多久没被调用
# 若太久没有调用todo工具更新，则会在返回工具调用结果的同时，返回一段提醒更新的文本
def agent_loop(messages: list):
    rounds_since_todo = 0 # 记录已经多少轮没有调用todo工具
    while True:
        # Nag reminder is injected below, alongside tool results
        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return
        results = []
        used_todo = False
        for block in response.content:
            if block.type == "tool_use":
                handler = TOOL_HANDLERS.get(block.name)
                try:
                    output = handler(**block.input) if handler else f"Unknown tool: {block.name}"
                except Exception as e:
                    output = f"Error: {e}"
                print(f"> {block.name}:")
                print(str(output)[:200])
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": str(output)})
                if block.name == "todo":
                    used_todo = True
        rounds_since_todo = 0 if used_todo else rounds_since_todo + 1
        if rounds_since_todo >= 3:
            results.append({"type": "text", "text": "<reminder>Update your todos.</reminder>"})
        messages.append({"role": "user", "content": results})
~~~

### 04: Subagent

Agent 工作越久, messages 数组越臃肿。每次读文件、跑命令的输出都永久留在上下文里。"这个项目用什么测试框架?" 可能要读 5 个文件, 但父 Agent 只需要一个词: "pytest。"



使用分治的思想，将大任务拆解成小任务并分别让Subagent完成。实现思想就是把Agent抽象成一个工具调用，父Agent负责将任务分配给子Agent，并且**父Agent和子Agent的messages是隔离开的**，最终子Agent只返回一段文本结果给父Agent。具体实现如下：

```python
# Step0: 工具定义，父Agent有一个用于创建子Agent的工具task
PARENT_TOOLS = CHILD_TOOLS + {
    "name": "task",
    "description": "Spawn a subagent with fresh context.",
    "inpu_schema": {
        "type": "object",
        "properties": {"prompt": {"type": "string"}, 
                       "description": {"type": "string", "description": "Short description of the task."}},
        "required": ["prompt"]
    }
}

# Step1: 工具实现
def run_subagent(prompt: str) -> str:
    sub_messages = [{"role": "user", "content": prompt}]
    # 设置Subagent最多运行步数
    for _ in range(30):
        response = client.messages.create(
            model=MODEL, system=SUBAGENT_SYSTEM,
            messages=sub_messages,
            tool=CHILD_TOOLS, max_token=8000
        )

        sub_messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            break
        results = []
        for block in response.content:
            if block.type == "tool_use":
                handler = TOOL_HANDLERS.get(block.name)
                output = handler(**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(output)[:50000]
                })
        sub_messages.append({"role": "assistant", "content": results})
    # 仅返回Subagent最后一步返回结果中类别为text的文本内容
    return "".join(b.text for b in response.content if hasattr(b, "text")) or "(no summary)"

# Step2: 父Agent的Agent loop
def agent_loop(messages: list):
    while True:
        response = client.messages.create(
        	model=MODEL, SYSTEM=PARENT_SYSTEM,
        	tools=PARENT_TOOLS, max_token=8000,
        )
        
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            break
        
        results = []
        for block in response.content:
            if block.type == "tool_use":
                # 工具调用变为两个分支，一个分支是创建subagent，另一个分支是其他工具调用
                if block.name == "task":
                    desc = block.input.get("description", "subtask")
                    prompt = block.input.get("prompt", "")
                    print(f"> task ({desc}): {prompt[:80]}")
                    output = run_subagent(prompt)
                else:
                    handler = TOOL_HANDLERS.get(block.name)
                    output = handler(**block.input) if handler else f"Unknown tool: {block.name}"
                print(f" {str(output)[:200]}")
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": str(output)})
    messsages.append({"role": "user", "content": results})
```

### 05: Skills

基础的 skill 机制，本质上是把某项能力的说明书（工具用途、调用规则、最佳实践、约束）封装进 `SKILL.md`，并**按需加载，而不是把所有能力一次性塞进主 prompt**。



具体实现方法则是在`SYSTEM`中加入所有skill的简介，并告知模型”需要哪个技能，就导入对应的markdown文本信息“。然后在工具集中提供可导入对应技能文本的工具。实现如下：

~~~python
# Step0: SYSTEM提示
SYSTEM = f"""You are a coding agent at {WORKDIR}.
Use load_skill to access specialized knowledge before tackling unfamiliar topics.

Skills available:
{SKILL_LOADER.get_description()}
"""

# Step1: SkillLoader定义，包括导入markdown文件，读取markdown信息等
class SkillLoader:
    def __init__(self, skills_dir: Path):
        self.skills_dir = skills_dir
        self.skills = {}
        self._load_all()
        
    def _load_all(self):
        if not self.skills_dir.exists():
            return
        for f in sorted(self.skills_dir.rglob("SKILL.md"))
        	text = f.read_text()
            meta, body = self.parse_frontmatter(text)
            name = meta.get("name", f.parent.name)
            self.skills[name] = {"meta": meta, "body": body, "path": str(f)}
        
    def _parse_frontmatter(self, text:str) -> tuple:
        # 挑出YAML frontmatter和正文部分，分别对应match.group(1)和match.group(2)
        match = re.match(r"^---\n(.*?)\n---\n(.*)", text, re.DOTALL)
        if not match:
            return {}, text
        try:
            meta = yaml.safe_load(match.group(1)) or {}
        except yaml.YAMLError:
            meta = {}
        return meta, match.group(2).strip()
    
    def get_description(self) -> str:
        # 获取每个skill对应的name和description
        if not self.skills:
            return "(no skills available)"
        lines = []
        for name, skill in self.skills.items():
            desc = skill["meta"].get("description", "No description")
            tags = skill["meta"].get("tags", "No tags")
            line = f" - {name}: {desc}"
            if tags:
                line += f"[{tags}]"
            lines.append(line)
        return "\n".join(lines)
    
    def get_content(self, name: str) -> str:
        skill = self.skills.get(name)
        if not skill:
            return f"Error: Unknown skill '{name}'. Avaliable: {', '.join(self.skills.keys())}"
        return f"<skill name=\"{name}\">\n{skill['body']}\n</skill>"

SKILL_LOADER = SkillLoader(SKILLS_DIR)    
    
# Step2: 在工具集中定义对应工具
TOOLS = {
    # Other Tools
    {"name": "load_skill", "description": "Load specialized knowledge by name.",
    "input_schema": {
        "type": "object",
    	"properties": {
            "name": {
                "type": "string",
                "description": "Skill name to load"
            }
        }
    	"required": ["name"]
    }}
}

TOOL_HANDLERS = {
    # Other Tools
    "load_skills": lambda **kw: SKILL_LOADER.get_content(kw["name"]),
}
~~~

### 06: Context Compact

传递给模型的`message`的上下文长度是有限的，读入文件等操作会占用大量tokens，因此传递的信息需要进行压缩。



对于`message`从两个方面进行压缩，一方面是仅保留最近的`tool_result`，将之前的`tool_result`替换为占位符；另一方面是将`message`保存下来，然后交给模型总结概要，仅用概要来参与接下来的对话。实现如下：

~~~python
# Method1: 保留最近的tool_result
def micro_compact(messages: list) -> list:
    tool_results = []
    for i, msg in enumerate(messages):
        if msg["role"] == "user" and isinstance(msg.get("content"), list):
            for j, part in enumerate(msg["content"]):
                if isinstance(part, dict) and part.get("type") == "tool_result":
                    tool_results.append((i, j, part))
    
    if len(tool_results) <= KEEP_RECENT:
        return
    # 对于要改为占位符的tool_result，会查询其对应的工具名并保存到messages中
    tool_name_map = {}
    for msg in messages:
        if msg["role"] == "assistant":
            content = msg.get("content", [])
            if isinstance(content, list):
                for block in content:
                    if hasattr(block, "type") and block.type == "tool_use":
                        tool_name_map[block.id] = block.name
    
    # 将旧的tool_result改为占位符
    to_clear = tool_results[:-KEEP_RECENT]
    for _, _, result in to_clear:
        # 对于只是string或者长度不长的tool_result继续保留
        if not isinstance(result.get("content"), str) or len(result["content"]) <= 100
        	continue
        tool_id = result.get("tool_use_id", "")
        tool_name = tool_name_map.get(tool_id, "unknown")
        # 对于指定要保留的工具结果进行保留
        if tool_name in PRESERVE_RESULT_TOOLS:
            continue
        result["content"] = f"[Previous: used {tool_name}]"
    return messages

# Method2: 将先前的messages保存下来，并让模型概括总结，作为当前messages的替代
def auto_compact(messages: list) -> list:
    transcript_path = TRANSCRIPT_DIR / f"transcript_{int(time.time())}.jsonl"
    with open(transcript_path, "w") as f:
        for msg in messages:
            f.write(json.dumps(msg, default=str) + "\n")
    print(f"[transcript saved: {transcript_path}]")
    
    conversation_text = json.dumps(messages, default=str)[-80000:]
    response = client.messages.create(
    	model=MODEL, 
    	messages= [{"role": "user",
                   	"content": "Summarize this conversation for continuity. Include: "
                   "1) What was accomplished, 2) Current state, 3) Key decisions made. "
                   "Be concise but preserve critical details.\n\n" + conversation_text}],
    	max_tokens=2000,
    )
    summary = next((block.text for block in response.content if hasattr(block, "text")), "")
    if not summary:
        summary = "No summary generated."
    return [
        {"role": "user", "content": f"[Conversation compressed. Transcript: {transcript_path}]\n\n{summary}"}
    ]
~~~

### 07: Task System

**03: TodoManager** 只是内存中的扁平清单：没有顺序、没有依赖、状态只有做完没做完。真实目标是有结构的 -- 任务 B 依赖任务 A，任务 C 和 D 可以并行，任务 E 要等 C 和 D 都完成。

没有显式的关系，Agent 分不清什么能做、什么被卡住、什么能同时跑。而且清单只活在内存里，上下文压缩一下就没了。



方法思想是为每个任务生成一个可以保存到磁盘的“任务图”。里面存储了各个步骤以及其对应的状态（pending, blocked, completed），与**03: TodoManager**类似，最大的区别在于**任务图还得记录哪些步骤被卡住了，需要等待哪些前置步骤完成才能执行**。具体实现如下：

~~~python
# 定义任务系统类，该类可以创建并存储、更新、展示和定向获取任务的能力
class TaskManager:
    def __init__(self, tasks_dir: Path):
        self.dir = tasks_dir
        self.dir.mkdir(exist_ok=True)
        self._next_id = self._max_id() + 1
    
    def _max_id(self) -> int:
        # 用于获取当前任务目录中最大的id
        ids = [int(f.stem.split("_")[1]) for f in self.dir.glob("task_*.json")]
        return max(ids) if ids else 0
    
    def _load(self, task_id: int) -> dict:
        # 根据索引id将任务目录中对应的任务读入
        path = self.dir / f"task_{task_id}.json"
        if not path.exists():
            raise ValueError(f"Task {task_id} not found")
        # 将json文件中的字符串转为dict
        return json.loads(path.read_text())
    
    def _save(self, task: dict):
        # 将任务存储到任务目录中
        path = self.dir / f"task_{task["id"]}.json"
        path.write_text(json.dumps(task, indent=2, ensure_ascii=False))
        
    def create(self, subject:str, description:str = "") -> str:
        # 创建新的任务
        task = {
            "id": self._next_id, "subject": subject, "description": description,
            "status": "pending", "blockedBy": [], "owner": "",
,        }
        self._save(task)
        self._next_id += 1
        return json.dumps(task, indent=2, ensure_ascii=False)
    
    def get(self, task_id: int) -> str:
        # 获取目标任务文本信息
        return json.dumps(self._load(task_id), indent=2, ensure_ascii=False)
    
    def update(self, task_id: int, status: str = None, add_blocked_by: list = None,
              removed_blocked_by: list = None) -> str:
        # 更新目标任务状态信息
        task = self._load(task_id)
        if status:
            if status not in ["pending", "in_progress", "completed"]:
                raise ValueError(f"Invalid status: {status}")
            task["status"] = status
            # 对于已经完成的任务，清除其他因为该任务而阻塞的任务的状态信息
            if status == "completed":
                self._clear_dependency(task_id)
        if add_blocked_by:
            # 更新需要完成的前置任务列表，使用set()来实现列表去重
            task["blockedBy"] = list(set(task["blockedBy"] + add_blocked_by))
        if remove_blocked_by:
            task["blockedBy"] = [x for x in task["blockedBy"] if x not in removed_blocked_by]
        self._save(task)
        return json.dumps(task, indent=2, ensure_ascii=False)
    
    def _clear_dependency(self, completed_id: int):
        # 遍历任务目录中的所有任务，清除所有包含已完成任务id的blockedBy列表
        for f in self.dir.glob("task_*.json"):
            task = json.loads(f.read_text())
            if completed_id in task.get("blockedBy", []):
                task["blockedBy"].remove(completed_id)
            	self._save(task)
                
    def list_all(self) -> str:
        # 将任务目录中的所有任务的状态及其前置任务打印出来
        tasks = []
        files = sorted(
        	self.dir.glob("task_*.json"),
        	key=lambda f: int(f.stem.split("_")[1])
        )
        for f in files:
            tasks.append(json.loads(f.read_text()))
        if not tasks:
            return "No tasks."
        lines = []
        for t in tasks:
            marker = {"pending": "[ ]", "in_progress": "[>]", "completed": "[x]"}.get(t["status"], "[?]")
            blocked = f" (blocked by: {t['blockedBy']})" if t.get("blockedBy") else ""
            lines.append(f"{marker} #{t['id']}: {t['subject']}{blocked}")
        return "\n".join(lines)
    
TASKS = TaskManager(TASKS_DIR)
    
# 定义模型的工具集
TOOLS = {
    # ...Other tools...
    "task_create": lambda **kw: TASKS.create(kw["subject"], kw.get("description", "")),
    "task_update": lambda **kw: TASKS.update(kw["task_id"], kw.get("addBlockedBy", []), kw.get("RemoveBlockedBy", "")),
    "task_list": lambda **kw: TASKS.list_all(),
    "task_get": lambda **kw: TASKS.get(kw["task_id"]),
}
~~~

### 08: Background Tasks

有些命令要跑好几分钟: `npm install`、`pytest`、`docker build`。阻塞式循环下模型只能干等。用户说 "装依赖, 顺便建个配置文件", Agent 却只能一个一个来。



解决办法是引入线程的概念，主进程执行到需要运行命令的任务时，将任务分配给线程后，继续执行主进程。因此也要使用**互斥锁**，来确保当前仅有一个线程在访问公共数据。具体实现如下：

~~~python
# Step0: 创建一个任务管理类，其中会为模型可调用工具集中提供运行任务和检查任务状态两种工具
class BackgroundManager:
    def __init__(self):
        self.tasks = {} # 记录当前存在的线程任务，task_id -> {status, result, command}
        self._notification_queue = [] # 记录已完成线程的输出结果
        self._lock = threading.Lock()
        
    def run(self, command: str) -> str:
        task_id = str(uuid.uuid4())[:8] # 为线程任务创建一个随机编号
        self.tasks[task_id] = {"status": "runnning", "result": None, "command": command}
        thread = threading.Thread(
        	target=self._execute, args=(task_id, command), daemon=True
        )
        thread.start()
        return f"Background task {task_id} started: {command[:80]}"
    
    def _execute(self, task_id: str, command: str):
        try:
            r = subprocess.run(
            	command=command, shell=True, cwd=WORKDIR,
            	capture_output=True, text=True, timeout=300
            )
            output = (r.stdout + r.stderr).strip()[:50000]
            status = "completed"
        except subprocess.TimeoutExpired:
            output = "Error: Timeout (300s)"
            status = "timeout"
        except Exception as e:
            output = f"Error: {e}"
            status = "error"
            
        with self._lock:
            self.tasks[task_id]["status"] = status
            self.tasks[task_id]["result"] = output or "(no output)"
            
            self._notification_queue.append({
                "task_id": task_id,
                "status": status,
                "command": command,
                "result": (output or "(no output)")[:500],
            })
    
    def check(self, task_id: str = None) -> str:
        # 如果输入了id，则返回该id任务的状态，否则打印当前所有任务状态
        if task_id:
            t = self.tasks.get(task_id)
            if not t:
                return f"Error: Unknown task {task_id}"
            return f"[{t['status']}] {t['command'][:60]}\n{t.get('result') or '(running)'}"
        lines = []
        for tid, t in self.tasks.items():
            lines.append({f"{tid}: [{t['status']}] {t['command'][:60]}"})
        return "\n".join(lines) if lines else "No background tasks."
    
    def drain_notification(self) -> list:
        # 将已完成任务的信息返回，并清空队列
        with self._lock:
            notifs = list(self._notification_queue)
            self._notification_queue.clear()
        return notifs
    
BG = BackgroundManager()

# Step1: 在模型工具集中提供对应工具
TOOLS = {
    # ...Other tools...
    "background_run": lambda **kw: BG.run(kw["command"]),
    "check_background": lambda **kw: BG.check(kw.get("task_id"))
}
~~~

### 09: Agent Teams

**04: Subagent**是一次性的：生成、干活、返回摘要、消亡。没有身份，没有跨调用的记忆。**08: Background Tasks**能跑 shell 命令，但做不了 LLM 引导的决策。真正的团队协作需要三样东西: 

- 能跨多轮对话存活的持久 Agent。

- 身份和生命周期管理。
- Agent 之间的通信通道。
