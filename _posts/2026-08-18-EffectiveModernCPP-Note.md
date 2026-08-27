---
layout: post
title: Effective Modern C++ 笔记
date: 2026-08-18
section: note
categories: CPP
summary: 《Effective Modern C++》的学习笔记，通过围绕关键词并且重新组织语言有逻辑的叙述要点，以此来巩固并方便以后直接查询。
---

## 引入

《Effective Modern C++》这本书是针对C++11和C++14版本提出了42条C++编程建议，里面包含了C++部分语法底层实现原理的解释，对部分抽象概念的多角度阐述等，虽然目前已经有了C++17、C++23等进一步的更新，但是C++11的一些概念思想仍然得以沿用，所以本书还是非常值得阅读学习，可以拓宽眼界、积累知识。



本博客会以关键词为中心阐述该关键词相关的知识点，以此来温习知识点，并且方便以后随时根据关键词查询，在编程中遇到该关键词或相关情境时能马上联想到需要注意的事项。在涉及书中相关条款（Item）时会进行标注，总共会覆盖书中的42个条款。

## 类型推导

C++的类型推导主要发生在三处地方：模板的类型参数、`auto`关键词和`decltype`关键词。类型自动推导可以让代码简化，避免由于手写类型出错带来的问题，但是另一方面，我们需要确保编译器能正确推导。因此在这三种情境下都有注意事项。

### 模板的类型参数推导规则

考虑到早在C++98就已经有一套用于函数模板的类型推导规则，而C++11的`auto`关键词的规则正是建立在该推导规则上的，并且书中的分类介绍比较清晰，因此直接使用这套介绍（*Item1*）。首先是建立一个函数模板：

```cpp
template<typename T>
void f(ParamType param);
```

其中`T`是要推导的类型，`ParamType`则包含`T`和一些修饰（例如`const`、`volatile`、引用修饰符`&`等）。对于该函数的调用可以表示为：

```cpp
f(expr);
```

编译器正是通过表达式`expr`来推导目标类型`T`。这里书中将`ParamType`情况分为三类：

#### `ParamType`是指针或引用（非通用引用）

```cpp
template<typename T>
void f(T& param);  // 类型一：引用类型

template<typename T>
void f(const T& param);  // 类型二：const引用类型

template<typename T>
void f(T* param);  // 类型三：指针类型

template<typename T>
void f(const T* param);  // 类型四：const指针类型
```

对于这一类的推导规则为：首先如果表达式`expr`是引用，**忽略引用部分**，然后`expr`的类型与`ParamType`进行模式匹配来决定`T`。

<div class="notice">关于这里的“忽略引用部分”，首先要明白<code>Type</code>、<code>Type&</code>和<code>const Type</code>是三种不同的类型，而类型推导是<b>不会保留引用部分</b>的，这意味着如果表达式<code>expr</code>是<code>Type</code>或是<code>Type&</code>，都只会推导出<code>Type</code>。而<code>const</code>是否会被忽略，这要取决于形参是否为引用，若为引用则应该保留<code>const</code>属性，而如果是按值传递，则形参是对实参的一个拷贝，因此不需要保留<code>const</code>属性。对于指针，底层的<code>const</code>无论是否为引用都会保留，而顶层的<code>const</code>同样取决于是否为引用。</div>

#### `ParamType`既不是指针也不是引用

```cpp
template<typename T>
void f(T param);
```

对于这一类的规则，同样会忽略`expr`的引用，并且如同前面所说，此时属于按值传递给形参，因此会忽略`const`和`volatile`修饰。对于指针则会保留底层`const`（修饰指针指向的对象），不保留顶层`const`（修饰指针本身）。

对于数组实参或函数实参，类型`T`会推导为指针或函数指针。若`ParamType`为引用，则可以保留原有数组或函数类型，其中数组类型还会包含大小信息：

```cpp
template<typename T>
void f(T& param); 

const char name[] = "J. P. Briggs";     //name的类型是const char[13]
f(name);  //T被推导为const char[13]，ParamType则为const char (&)[13]

//可以利用这一点来获取目标数组大小信息
// constexpr修饰表示该函数可在编译期求值，前提是传入的是编译期常量
template<typename T, std::size_t N>                     
constexpr std::size_t arraySize(T (&)[N]) noexcept      
{                                                       
    return N;                                           
}   
```

#### `ParamType`是通用引用

```cpp
template<typename T>
void f(T&& param);
```

该类的规则：如果表达式`expr`是左值，那么就会把类型`T`**推导为左值引用**。这也有别于前面两个都会忽略引用的情况。当`T`为左值引用时，根据引用折叠规则，`ParamType`也将是左值引用。如果表达式`expr`是右值，则`T`是非引用类型，而`ParamType`则是右值引用。

### `auto`关键字

C++11引入的`auto`推导规则与模板推导规则基本一致，`auto`扮演了模板中`T`的角色，除了“花括号初始化”这一特殊情况（*Item2*）。具体来说，当使用花括号初始化一个用`auto`进行声明的变量时，`auto`会被推导为`std::initializer_list<Type>`类型，其中`<Type>`也意味着花括号中元素都是同一类型`Type`。这表明`auto`在遇到花括号时会默认推导为`std::initializer_list`，然后再根据花括号中的元素类型推导成一个具体的类`std::initializer_list<Type>`。但是**模板的类型参数是无法推导花括号实参的类型的**！将花括号表达式传给一个形参为`T`函数模板时将会报错，除非函数模板的形参明确为`std::initializer_list<T>`。

在C++14中，`auto`增加了使用情景，首先是`auto`可以作为函数的返回类型，让编译器根据函数的返回值推导其类型；然后是在*lambda*函数中可以使用`auto`来声明形参类型。需要注意的是在这两处使用的`auto`将**同样无法推导花括号实参的类型**（*Item2*）。

在代码中优先考虑使用`auto`声明而非显式类型声明（*Item5*），这么做的优势包括：变量必须要初始化、省略冗长的类型名、用于未知类型的变量（例如*lambda*返回的闭包对象）、避免手写类型出错（可能会导致隐式转换）、方便代码重构。

使用`auto`声明也会存在问题，除了代码可读性下降外，在涉及到“不可见的代理类”时，类型推导结果可能并不是我们想要的。例如对类型`std::vector<bool>`使用操作符`[]`会得到`std::vector<bool>::reference`类型而不是`bool&`类型，这是因为`std::vector<bool>`使用*1 bits*来存储一个`bool`元素，可以节省空间，但是C++不允许对`bits`进行引用操作，因此使用这个可以表现的和`bool&`类型一致的代理类。此时，作者建议使用**显式类型初始化惯用法**强制`auto`推导出你想要的结果（*Item6*）：

```cpp
auto b = static_cast<bool>(std::vector<bool>(10, true)[5]);
```

你可能有疑问这么写不如直接显式声明`b`的类型为`bool`，我想作者是考虑如何在这种情况下继续保持使用`auto`的习惯。此处我认为了解到“代理类”的存在是一件更重要的事。

### `decltype`关键字（*Item3*）

`decltype`不同于`auto`存在对某些属性的忽略，它会将表达式类型完完整整的返回，会保留原类型中的引用、`const`等属性。这个关键字最主要的用途是**在函数模板中，函数的返回类型会依赖于形参类型**。在C++11中，会使用尾置返回类型语法来实现：

```cpp
template<typename Container, typename Index>
auto authAndAccess(Container& c, Index i)
-> decltype(c[i])
{
    authenticateUser();
    return c[i];
}
```

尾置返回类型的好处是可以在函数返回类型中使用函数形参相关的信息。在C++14中支持`decltype(auto)`的使用，这个关键字的含义是：`auto`说明符表示这个类型将会被推导，`decltype`说明`decltype`的规则将会被用到这个推导过程中。因此可以改进为：

```cpp
template<typename Container, typename Index>
decltype(auto) authAndAccess(Container& c, Index i)
{
    authenticateUser();
    return c[i];
}
```

`decltype`还有一个要注意的点是：对于比单纯的变量名更复杂的左值表达式，它会确保报告的类型始终是左值引用。例如：

```cpp
int x = 0;
// decltype(x)是int，但是decltype((x))是int&
```

这也意味着当函数返回类型为`decltype(auto)`时，使用`return x`和`return (x)`的结果是不同的，需要注意。`decltype`的规则可以记成：

decltype(未加括号的变量名) → 变量声明时的类型

decltype(表达式) 左值 → `T&`；将亡值xvalue → `T&&`；纯右值prvalue → `T`

### 查看类型推导结果（*Item4*）

这里作者给出了三个用来检查编译器对类型推导的结果的方法，**首先**是IDE编辑器可以直接显示，因为C++编译器运行于IDE中，因此可以查看其推导结果。**第二个**是创建一个模板类但不定义，然后将想要查询类型的目标对象结合`decltype`传入给该类，通过查看编译器报错来确定目标对象的类型。**第三个**就是使用`typeid()`函数，它会返回`std::type_info`对象，使用该对象的`name()`成员函数来获取目标类型名，但是这个方法显示的类型名并不直白，也可能会不准确。也可以考虑使用Boost TypeIndex库。

## 对象初始化（*Item7*）

C++有以下三种初始化对象方法：

```cpp
int x(0);    //直接初始化，使用圆括号
int y{0};    //直接列表初始化，使用花括号
int z = 0;   //拷贝初始化，使用 =

int z = {0}; //等价于直接列表初始化
```

对于直接初始化，其具有与C++98语法的一致性，但它存在最令人头疼的解析（most vexing parse）：C++在**遇到“既能解释成声明，又能解释成表达式”的情况时，倾向于选择“声明”**。当你想调用某个类的无参构造函数来初始化该对象，但是使用了直接初始化方法，编译器会将这行代码看成是一个函数的声明，这也导致了类内的数据成员不能使用直接初始化语法。

对于直接列表初始化，它的特点是**禁止隐式的变窄转换**，而其它两种初始化不会检查变窄变换，这是为了兼容老旧代码。另外，它会经常和`std::initializer_list`类纠缠：

- 对`auto`声明的对象使用直接列表初始化，`auto`会直接推导为`std::initializer_list`类；
- 若类的构造函数中存在使用`std::initializer_list<T>`类作为形参的重载版本，则**花括号初始化会无视其它“最佳匹配”版本，直接调用该版本，除非花括号实参中的元素无法转化为类型`T`**。不过，如果实参使用空的花括号初始化，则会调用默认构造函数版本，你也可以在花括号中额外添加一个空的花括号来实现“用空`std::initializer`来调用`std::initializer_list<T>`版本的构造函数”。

对于拷贝初始化，书中提到不可拷贝的对象不能使用该初始化，例如`std::atomic`类创建对象，但是我在VS上测试了C++14和C++17以及之后的版本，发现对于`std::atomic`和自定义类（删除拷贝构造和拷贝赋值）是可以使用拷贝初始化的。一个合理的解释是：原来的拷贝初始化都是先用等号右边的表达式构造一个临时对象，再用这个临时对象去拷贝构造等号左边的对象，因此不可拷贝对象是不能使用拷贝初始化的，但是现在的编译器会做优化处理，在使用拷贝初始化时，编译器会直接拿等号右边的表达式去构造等号左边的对象，从而跳过了构造临时对象的步骤，也就不要求对象能否拷贝。

作者对于使用哪一种初始化的建议是：选择一种并坚持使用。因此需要了解不同初始化方法的特点和可能带来的问题。

## `nullptr`关键字

作者认为在表达空指针时要优先考虑`nullptr`而不是`0`和`NULL`（*Item8*）。这个主要是历史因素，在C++98中是使用`0`和`NULL`来表示空指针的，因此需要在C++11中转变习惯。在现在C++编程中大概是理所当然的事了。需要注意的是`nullptr`的类型是`std::nullptr_t`，这个类型的特点是可以隐式转换为任何指针类型。`0`和`NULL`通常被推导为整型，因此使用这两个作为空指针会在模板推导和函数重载版本调用时出现问题。

## `using`和`typedef`关键字

C++98的`typedef`关键字和C++11的别名声明`using`关键字都是为了给冗长的类型名定义简短清晰的别名。作者认为在定义别名时优先考虑`using`而非`typedef`（*Item9*）。因为`using`关键字支持使用模板化，而`typedef`不直接支持，以下是二者的模板化实现对比：

```cpp
// using关键字的实现
template<typename T>                           
using MyAllocList = std::list<T, MyAlloc<T>>; 

MyAllocList<Widget> lw;

// typedef关键字的实现
template<typename T>
struct MyAllocList {
    typedef std::list<T, MyAlloc<T>> type;
};

MyAllocList<Widget>::type lw;      
```

这里还引入了“依赖类型”的概念：一个类型的具体含义要等模板参数确定之后才能知道。在使用这种类型时要再前面加上`typename`关键字。例如：

```cpp
template<typename T>
class Widget {
private:
    typename MyAllocList<T>::type list;
    …
}; 
```

此处是在新定义的模板类`Widget`中要使用前面定义的模板结构体`MyAllocList`中的类型别名，但是在`T`未确定时，编译器不知道`MyAllocList<T>::type`是一个类型名还是一个变量，因此需要显式用`typename`来告知编译器，这也是`typedef`带来的不便之处。

## `enum`关键字

`enum`用来定义枚举名集合，而这个枚举分为非限域`enum`和限域`enum`，前者定义的枚举名的作用域是**包含这个enum的作用域**，而后者的枚举名的作用域在`enum`内，具体如下：

```cpp
// 非限域enum，外部直接使用枚举名，但也会污染外部命名空间
enum Color { black, white, red };
Color c = white;

// 限域enum，与前者的区别在于多了个class，因此也称枚举类
enum class Color { black, white, red };
Color c = Color::white;
```

限域`enum`除了作用域不同，相比于非限域`enum`还有其它特点：

- 限域`enum`的枚举名是强类型，不允许隐式转换，只能用`static_cast<>`显式转换。
- 编译器对限域`enum`会默认使用`int`进行底层实现，因此其可以直接前置声明。前置声明的好处是可以将声明与定义分开，将声明放在头文件中，这样即使修改定义，所有包含该头文件的文件也不用重新编译。

非限域`enum`如果指定了底层实现类型，也可以进行前置声明：

```cpp
enum Color: std::uint8_t;
```

作者的建议是优先考虑限域`enum`而非未限域`enum`（*Item10*），因为非限域`enum`是C++98的遗留产物，并且限域`enum`的特点更有优势。

## `delete`关键字

使用`delete`修饰函数可以避免调用，常用于修饰类内的特殊成员函数，因为C++会自动为类生成这些函数。在C++98中是通过将这些函数声明在*private*中并不提供定义来实现删除效果。作者提出优先考虑使用`delete`而不是使用C++98的老方法（*Item11*）。

除了修饰类内特殊成员函数，`delete`还有其它应用场景：

- 禁止函数的某个特定重载版本。具体来说，当你希望函数避免通过隐式转换来调用当前版本，你可以将可能会发生隐式转换的版本`delete`。
- 禁止模板函数的某个特定实例化。当你希望避免某个特定类型推导结果的实例化，可以将这个实例`delete`。

值得一提的是，如果你是希望禁止**某个类内**的模板函数的特定实例化，你需要在**类外**来`delete`特定的实例化，这是因为**模板实例化必须位于一个命名空间作用域**，而不是类作用域，具体如下：

```cpp
class Widget {
public:
    …
    template<typename T>
    void processPointer(T* ptr)
    { … }
    …

};

// 禁止processPointer函数模板推导出void类型版本
template<>
void Widget::processPointer<void>(void*) = delete;
```

## `override`关键字

`override`是为了告诉编译器当前函数是在重写基类的虚函数，防止“你以为你在重写，但因为不符合要求结果写了一个派生类特有的函数”的情况发生，成功重写的要求包括：基类函数为虚函数（*virtual*）；函数签名相同（包括函数名、形参类型）；函数常量性一致；返回值和异常说明兼容；引用限定符一样。（*Item12*）

引用限定符是用来限制类的成员函数只能被左值对象或右值对象调用的语法，该语法可以用来根据调用时对象的类型来输出（对象为右值时返回右值引用来移动），具体如下：

```cpp
class Widget {
public:
    using DataType = std::vector<double>;

    // 只有*this为左值时才被调用
    DataType& data() & {
        return values;
    }

    // 只有*this为右值时才被调用
    DataType data() && {
        return std::move(values);
    }

private:
    DataType values;
};
```

## `const_iterator`和`iterator`

C++中常用迭代器来访问容器中的元素，标准库中的容器基本都提供了`begin()`、`end()`、`cbegin()`、`cend()`、`rbegin()`和`rend()`来获取其迭代器。值得一提的是，迭代器承担的是“定位”作用，所以非`const`容器的插入删除操作是可以传入`const_iterator`作为参数的。（*Item13*）

除了容器本身的成员函数，C++也提供了全局的容器迭代器获取函数：`std::begin()`、`std::end()`等，需要`#include<iterator>`。

## `noexcept`关键字

作者建议：如果函数不抛出异常则使用`noexcept`修饰（*Item14*）。使用`noexcept`不仅是作为接口信息告诉调用者，它还能带来效率的提升：

- `noexcept`表明异常**不能从当前函数传播出**，因此编译器不需要为“将异常传播出去的栈展开”做完整支持，提供了优化空间。
- `noexcept`可以允许一些强异常保证函数安全调用。例如`std::vector::push_back`会在容器装满时开辟新的内存来存放旧内存的数据，而它会采取“若元素移动操作为`noexcept`则移动，否则使用复制”的策略，防止移动操作异常导致数据无法恢复。

另外，一些函数使用`noexcept`是必要的，内存释放函数和析构函数通常都是隐式`noexcept`。`swap`操作也非常适合作为`noexcept`，因为它是标准库算法常用操作，通常根据元素交换是否为`noexcept`来决定容器交换是否为`noexcept`，使用`noexcept()`语法来实现：

```cpp
// 数组交换操作
template <class T, size_t N>
void swap(T (&a)[N],
          T (&b)[N]) noexcept(noexcept(swap(*a, *b))); 
```

## `constexpr`关键字

`constexpr`关键字可以用修饰对象和函数。当用来修饰对象时，表明该对象是在编译期可知的常量，这也意味着这些值具有`const`属性，因此，所有`constexpr`对象都是`const`。`constexpr`对象常用于表示数组大小、整数模板参数、枚举名的值、对齐修饰符等地方。

当用来修饰函数时，表达的含义会更加灵活：如果实参是编译期常量，则`constexpr`函数也会返回编译期可知的结果，但如果实参是运行时才能知道的值，则`constexpr`函数会和普通函数一样，在运行时返回结果。另外，`constexpr`函数还有其他特点：它被限制为只能获取和返回字面值类型；它和`const`函数没有必然联系，两个关键词作用不同，`const`用来修饰成员函数，表明函数不会修改对象中的值。综上看来，在`constexpr`函数中调用其他函数，其他函数也应该是`constexpr`属性的，不过局部变量不需要有`constexpr`属性。

作者关于该关键字的建议是：尽可能的使用`constexpr`（*Item15*）。因为将部分工作提前到编译期完成，就可以让运行时速度更快，另外，包含该属性的对象和函数会比`non-constexpr`的对象和函数的使用范围更大，让调用者知道可以在更多情景下使用该对象和函数。

## `const`成员函数的线程安全问题

`const`成员函数通常意味着该函数不会修改类内的成员变量，因此外部即使多线程调用也不用担心，毕竟属于“只读”操作，但是当`const`成员函数中存在修改`mutable`修饰的成员变量操作时，就需要确保`const`成员函数的线程安全。确保线程安全的方法分为使用`std::atomic`变量和使用互斥量`std::mutex`。

`std::atomic`变量用来让该共享变量的单次读写操作为原子操作，普通变量的修改操作包括：读取变量、修改变量和保存变量，而`std::atomic`可以确保这个过程不被打断。这个方法适用于仅存在单个共享变量，它比使用互斥量的性能更好。

`std::mutex`互斥量适用场景要更加广泛，它通常搭配`std::lock_guard<>`使用，常见使用方式如下：

```cpp
std::mutex m;
void func()
{
    std::lock_guard<std::mutex> g(m);  //获取互斥量m
}  //释放互斥量m
```

`std::mutex`对象有`lock()`和`unlock()`操作，分别表示尝试获取互斥量和释放互斥量，而`std::lock_guard`对象可以理解为在构造时调用互斥量的`lock()`，在析构时调用互斥量的`unlock()`，这么做可以在生命周期结束时自动释放互斥量，符合*RAII*思想。

因此在设计类的`const`成员函数时，需要考虑将来在被多线程调用该类同一个对象的`const`函数时是否存在线程安全问题，这也是作者想表达的观点（*Item16*）。

## 特殊成员函数的生成规则

在满足某些前提下，C++会为类隐式生成特殊成员函数，包括：默认构造函数、析构函数、拷贝构造函数、拷贝赋值运算符、移动构造函数和移动赋值运算符。C++生成的特殊成员函数是`public`且`inline`的，并且为非虚函数，只在需要使用这些函数时才会生成。以下是各个特殊成员函数的生成规则（*Item17*）：

**默认构造函数**：仅当类中不存在任何用户声明的构造函数时才自动生成。

**析构函数**：当类中不存在析构函数时自动生成，另外生成的析构函数默认为`noexcept`，并且如果当前类继承自含有虚析构函数的基类，那么生成的析构函数也是虚函数。

**拷贝构造函数和拷贝赋值操作符**：两个拷贝操作相互独立，同样是当类中不存在相应函数时自动生成，但是如果类中存在移动操作，那么这两个拷贝操作不会生成。

**移动构造函数和移动赋值操作符**：两个移动操作相互关联，若其中一个声明，编辑器不再生成另一个。另外，若类中有用户定义的拷贝操作或析构函数，同样不会生成移动操作。因此移动操作的生成前提更加严格。

还有一个比较少见的情况是：成员函数模板不会阻止特殊成员函数的生成。例如：

```cpp
// 若外部进行拷贝构造/赋值，会优先调用编辑器生成的构造/赋值函数版本
// 因为当模板实例化函数和非模板函数匹配优先级相当时，优先使用非模板函数
class Widget {
    …
    template<typename T>
    Widget(const T& rhs);

    template<typename T>
    Widget& operator=(const T& rhs);
    …
};
```

*Rule of Five*提出若类中需要自己定义其中一个特殊成员函数，那么其他四个也要考虑是否自定义。虽然编辑器具有自动生成的功能，但是建议不要依赖“隐式”生成，即使符合前提，并且生成版本正是你想要的，也可以用`=default`再手动声明，代码会更加清晰。

## 智能指针

智能指针将裸指针进行封装，在生命周期结束时自动释放资源，并且智能指针本身还体现了对资源的所有权情况。智能指针包括：`std::unique_ptr`、`std::shared_ptr`和`std::weak_ptr`。

### `std::unique_ptr`（*Item18*）

该智能指针体现了对资源的专有所有权语义，由该指针拥有其所指向的内容，并负责资源的释放。该指针可用于管理数组（但不建议）。在默认情况下，其释放资源的方式是通过`delete`来实现，但是也可以自定义删除器。当使用默认删除器时，`std::unique_ptr`的大小等同于原始指针，如果使用自定义删除器，则其大小取决于自定义删除器：

- 若删除器为函数指针形式，则`std::unique_ptr`大小从一个字变为两个字
- 若删除器为函数对象形式，则变化大小取决于函数对象中存储的状态多少，而无状态函数（如不捕获变量的*lambda*）则没有影响

另外，删除器的类型是需要作为类型参数传入`std::unique_ptr`模板中的，这也意味着删除器类型不同的`std::unique_ptr`是不同的类型。

`std::unique_ptr`的常见初始化可分为原始指针构造、`std::make_unique`和对已有的`std::unique_ptr`移动构造。这里讨论一下前两个构造的对比，作者建议优先考虑使用`std::make_unique`（*Item21*），除了代码简化，还有一个原因是当无法保证`new`操作和智能指针构造之间不存在其它操作时，可能会出现资源泄漏，具体如下：

```cpp
processWidget(std::unique_ptr<Widget>(new Widget),  //潜在的资源泄漏！
              computePriority());
```

考虑一个函数调用，此时计算实参的顺序可以是：先用`new`申请内存，再执行`computePriority()`，最后将原始指针用于智能指针构造。这个过程中若`computePriority()`异常，则第一步申请的内存就会泄漏。

不过也存在使用原始指针构造的情况：需要自定义删除器时只能使用原始指针构造。另外是资源对象的初始化参数需要用花括号时，使用`std::make_unique`需要修改：

```cpp
//创建std::initializer_list
auto initList = { 10, 20 };
//使用std::initializer_list为形参的构造函数创建std::vector
auto spv = std::make_shared<std::vector<int>>(initList);
```

在Pimpl惯用法（*pointer to implementation*）中使用`std::unique_ptr`有一些注意事项（*Item22*）。Pimpl惯用法是指将自定义类中的成员数据打包成一个结构体，然后将结构体的具体实现放到类的实现文件（.cpp）中，这样类的头文件（.h）就不需要包含各种各样的库，那么这个类的使用者在包含该类的头文件时会更加轻量，不会因为该类的实现修改而需要重新编译。可以使用`std::unique_ptr`来管理这个结构体：

```cpp
//----------在“Widget.h”文件中----------
class Widget {
public:
    Widget();
    ~Widget();
    Widget(Widget&& rhs);
    Widget& operator=(Widget&& rhs);
    …
private:
    struct Impl;
    std::unique_ptr<Impl> pImpl;   
}
//----------在“Widget.cpp”文件中----------
#include "widget.h"
#include "gadget.h"
#include <string>
#include <vector>

struct Widget::Impl {
    std::string name;
    std::vector<double> data;
    Gadget g1,g2,g3;
};

Widget::Widget()
: pImpl(std::make_unique<Impl>())
{}

Widget::~Widget() = default;
Widget::Widget(Widget&& rhs) = default;
Widget& Widget::operator=(Widget&& rhs) = default;
```

这里可以发现即使使用了编辑器生成的特殊成员函数版本，也仍然将函数定义放到了实现文件中，并且位于结构体`Impl`定义之后。这就是需要注意的地方：在调用`std::unique_ptr`的析构函数时，该析构函数中的`delete`操作会要求类型完整（此处是要求`Impl`类型完整），因此如果将`Widget`类的析构函数和移动操作定义放在头文件中（生成的特殊成员函数为`inline`），则在编译时会不知道`Impl`的完整类型，因此要将函数定义放在实现文件并且是`Impl`定义之后。

如果将上述的`std::unique_ptr`换成`std::shared_ptr`，则没有这个要求。原因在于`std::shared_ptr`的析构函数是调用控制块中的删除器操作，而控制块中的删除器操作是在`std::shared_ptr`构造时就已经确定了，因此共享指针的析构函数不会要求类型完整。

### `std::shared_ptr`（*Item19*）

该智能指针允许多个指针共享资源的所有权，只有当最后一个指针结束生命周期时，才会释放资源。该指针最大的特点是内部除了指向资源的原始指针，还有一个指向控制块的指针，控制块中存放了引用计数、弱引用计数、自定义删除器、自定义分配器等信息。该指针无法用于管理数组。因为该指针的共享特点和控制块的存在，其要求的性能会比`std::unique_ptr`高，但其中有一些可以避免：

- `std::shared_ptr`的大小是原始指针的两倍，但是自定义删除器不会影响它的大小，因为删除器存放在控制块中，而控制块位于堆中。
- 需要为控制块申请动态内存分配，不过使用`std::make_shared`创建可以让控制块和资源一起申请内存分配，从而避免额外一次申请，不过`std::make_shared`不支持自定义删除器（*Item21*）。
- 引用计数的改动操作是原子性的。这么做是为了线程安全，不过在使用移动操作时不会改动引用计数，因为移动意味着一个指针不再享有资源所有权，而一个新指针会拥有资源所有权，一加一减也就不用改动。
- 控制块中使用了虚函数机制，因为控制块本身实现使用了继承，在销毁对象时会通过运行时多态来调用对应的销毁操作。

不同于`std::unique_ptr`，自定义删除器时不需要将删除器类型作为类型参数传入`std::shared_ptr`模板，这也意味着不同删除器的`std::shared_ptr`仍然是同一类型。

该指针还有一个问题是控制块的创建时机，只有当明确指向一个资源对象时才会创建控制块，用`nullptr`初始化时是不会创建控制块的。可以用三种方法来创建：

- 使用`std::make_shared`初始化一个`std::shared_ptr`时，会创建控制块。
- 使用`std::unique_ptr`初始化一个`std::shared_ptr`时，会创建控制块，并且`std::unique_ptr`会被设为`null`。不过不能用`std::shared_ptr`去初始化一个`std::unique_ptr`，即使引用计数为1也不行。
- 使用原始指针初始化一个`std::shared_ptr`时，会创建控制块。这一点需要注意，因为可能会出现**多次使用同一原始指针初始化，导致为同一资源创建了多个控制块**。一般建议直接在初始化`std::shared_ptr`那行代码中使用`new`来获取原始指针来避免。

书中提到了一个使用场景要注意：在类内使用`this`指针来构造`std::shared_ptr`，这是不安全的，因为你无法确定外部会不会已经使用了`std::shared_ptr`来管理该对象，这会导致该对象与多个控制块关联。作者给出了解决方案，是使用`std::enable_shared_from_this`：

```cpp
std::vector<std::shared_ptr<Widget>> processedWidgets;

class Widget: public std::enable_shared_from_this<Widget> {
public:
    …
    void process();
    …
};

void Widget::process()
{
    …
    //把指向当前对象的std::shared_ptr加入processedWidgets
    processedWidgets.emplace_back(shared_from_this());
}
```

若想在类内使用`this`创建`std::shared_ptr`，可以让类继承模板类`std::enable_shared_from_this`，其中类型参数即为当前类，然后在类中使用`shared_from_this()`来作为`this`创建`std::shared_ptr`。`std::enable_shared_from_this`的原理是保存了一个`std::weak_ptr`，当使用共享指针管理该类对象时，共享指针会判断该类是否继承自`std::enable_shared_from_this`，若继承了则检查其中的`std::weak_ptr`是否已经指向了某个控制块，若没有则创建控制块，若有则直接使用那个控制块。以此来避免为该对象创建多个控制块关联。

`std::shared_ptr`的常见初始化与`std::unique_ptr`一致，同样建议优先考虑使用`std::make_shared`来初始化（*Item21*），不仅有`std::make_unique`的优势，还能少进行一次内存申请。但也存在需要使用原始指针初始化的场景，除了`std::unique_ptr`提到的自定义删除器和花括号，还有额外两种场景：

- 类重载了`new`操作符和`delete`操作符，这表明类是自定义内存管理。由于使用`std::make_shared`会申请一片内存用于存储资源对象和控制块，自定义内存管理会忽视控制块资源的释放。
- 如果指向该资源的`std::weak_ptr`比`std::shared_ptr`活得更久时不建议使用。原因是只有当没有`std::weak_ptr`指向时才会释放控制块内存，但是`std::make_shared`是控制块和资源对象捆绑的，控制块没释放则整个申请的内存都不会释放，因此即使没有`std::shared_ptr`，也会因为存在`std::weak_ptr`而持续占着那片内存。

### `std::weak_ptr`（*Item20*）

该指针与`std::shared_ptr`相关联，它可以和`std::shared_ptr`指向同一个资源对象但不增加引用计数，这意味着它提供了一个访问资源的渠道，但是它不负责管理资源的生命周期，这也导致可能会出现“指向的资源已经被释放”的情况，因此该指针是没有解引用操作的，此时需要将该指针“转换”为`std::shared_ptr`来使用，有两种方法：

- 使用`std::weak_ptr::lock`函数，如果所指向的资源对象没有过期，则会返回该对象的`std::shared_ptr`，否则返回空的`std::shared_ptr`。
- 直接用该指针去初始化一个`std::shared_ptr`对象，如果资源对象已经过期，则会抛出异常`std::bad_weak_ptr`。

## 右值引用和通用引用

**右值引用**常常和移动操作一起出现，为了对某个对象使用移动操作来避免昂贵的拷贝操作，需要先将该对象转为右值引用类型。**通用引用**则是利用引用折叠规则自适应推导为左值引用或右值引用类型。

两种引用在代码中都呈现为类似`T&&`的结构，区分的规则可总结如下（*Item24*）：

- 如果一个函数模板形参的类型为`T&&`，并且`T`需要被推导得知，或者如果一个对象被声明为`auto&&`，这个形参或者对象就是一个通用引用
- 如果类型声明的形式不是标准的`type&&`，或者如果类型推导没有发生，那么`type&&`代表一个右值引用

```cpp
// 此处展示一些容易迷惑的例子：
template<typename T>
void f(std::vector<T>&& param);     //param是右值引用

template <typename T>
void f(const T&& param);        //param是右值引用

template<class T, class Allocator = allocator<T>>
class vector
{
public:
    void push_back(T&& x);		//x不是右值引用
    
    template <class... Args>
    void emplace_back(Args&&... args);		//args是右值引用
    …
}
```

两种引用常作为函数的形参类型，可是需要注意的一点是**在函数中，形参永远是作为左值存在的**。因此需要使用`std::move()`来转换为右值引用，使用`std::forward<>()`来保留实参在传入前的左值或右值属性（即完美转发）。两个函数只负责完成类型上的转换（*Item23*），`std::move()`所做操作可近似为：

```cpp
template<typename T>
decltype(auto) move(T&& param)
{
    // 确保无论传入的是左值还是右值，最终都返回右值引用
    using ReturnType = std::remove_reference_t<T>&&;
    return static_cast<ReturnType>(param);
}
```

而`std::forward<>()`所做操作可近似为：

```cpp
template<typename T>
T&& forward(std::remove_reference_t<T>& param)
{
    return static_cast<T&&>(param);
}
```

`std::forward<>()`所展现的神奇的自适应推导能力实际上就是靠传入的模板的类型参数，并结合引用折叠规则实现的。引用折叠是指引用的引用，用户是不能显式声明的，所以一般是出现在类型推导的地方（模板类/函数、`auto`和`decltype`），该规则可总结为：**如果任一引用为左值引用，则结果为左值引用。否则为右值引用。**（*Item28*）

下面是`std::forward<>()`的使用案例：

```cpp
// ---------- 案例一 ----------
// 当传入setName的实参为左值时，T会推导为std::string&
// 当传入setName的实参为右值时，T会推导为std::string
class Widget {
public:
    template<typename T>
    void setName(T&& newName)           //newName是通用引用
    { name = std::forward<T>(newName); }
    …
private:
    std::string name;
};

// ---------- 案例二 ----------
// 当func对应实参为左值时，decltype(func)为左值引用
// 当func对应实参为左值时，decltype(func)为右值引用
auto timeFuncInvocation =
    [](auto&& func, auto&&... params)           //C++14
    {
        start timer;
        std::forward<decltype(func)>(func)(
            std::forward<decltype(params)>(params)...
        );
        stop timer and record elapsed time;
    };
```

案例一结合引用折叠规则很好理解`std::forward`是如何推导的。案例二有一些值得讨论的地方。首先是当使用`auto`作为*lambda*函数的形参类型时，`std::forward`不能直接使用类型参数`T`来推导，而要结合`decltype`来推导形参类型（*Item33*）。虽然当实参为右值时，传入给`std::forward`的类型参数会是右值引用，不同于案例一的非引用类型，不过根据引用折叠规则还是会正确返回右值引用。此外还有一个书中未提及的我自己的疑问，不是说形参都是作为左值存在吗？为什么这里的`decltype(func)`或`decltype(params)`能推导出右值引用类型呢？实际上，一个声明为右值引用类型的变量，与使用该变量名形成的表达式是左值，并不矛盾。

关于`std::move()`和`std::forward<>()`还有一个问题：对于按值返回的函数，是否要使用`return std::move(...)`或者`return std::forward<>()`来进行优化（外部用变量接收时，如果返回的是右值可触发移动操作而非拷贝操作）？答案是当可以触发返回值优化（NRVO/RVO）或返回一个传值形参时，不要使用，否则可以使用（*Item25*）。**当要返回函数内的局部对象（不包括形参）时**，函数可直接在分配给它的返回值内存中构造该局部对象（若是返回临时对象，比如`return Widget{}`，还可以直接在接收变量处构造），显式转换右值反而会阻止该优化。**当要返回传值形参时**，编译器会将其自动视为右值，因此也不需要再显式转换右值。下面是两个可以使用的案例：

```cpp
Matrix operator+(Matrix&& lhs, const Matrix& rhs)
{
    lhs += rhs;
    return std::move(lhs);	        //移动lhs到返回值中
}

template<typename T>
Fraction reduceAndCopy(T&& frac)  //通用引用的形参
{
    frac.reduce();
    return std::forward<T>(frac); //移动右值，或拷贝左值到返回值中
}
```

### 以通用引用为形参的重载函数的优先级问题（*Item26 & Item27*）

以通用引用为形参的函数因为其自动推导能力具有强大的灵活匹配机制，当该函数与其他非模板函数进行函数重载时，只有当实参类型完美匹配非模板函数（包括`const`、引用等属性完全一致），才会优先调用非模板函数，否则都会去调用以通用引用为形参的重载版本。以下是具体例子：

```cpp
class Person {
public:
    template<typename T>            //完美转发的构造函数
    explicit Person(T&& n)
    : name(std::forward<T>(n)) {}

    explicit Person(int idx);       //int的构造函数

    Person(const Person& rhs);      //拷贝构造函数（编译器生成）
    Person(Person&& rhs);           //移动构造函数（编译器生成）
    …
};

Person p("Nancy"); 
auto cloneOfP(p); 					//因为p没有const属性，所以调用通用引用版本构造函数

class SpecialPerson: public Person {
public:
    SpecialPerson(const SpecialPerson& rhs)
    : Person(rhs) //调用基类Person的通用引用版本构造函数
    { … }

    SpecialPerson(SpecialPerson&& rhs)
    : Person(std::move(rhs)) //调用基类Person的通用引用版本构造函数
    { … }
};
```

比较简单粗暴的处理方法就是重载和通用引用，舍弃其一。具体来说，使用通用引用的函数用不同的函数名（不适用于类的构造函数）；使用`const T&`或者按值传递来代替通用引用，效率会有所下降。如果无法舍弃二者，可考虑其它两种处理方法：*tag dispatch*方法和模板约束方法，两个方法的核心都是通过判断输入类型来决定是否启用通用引用形参函数版本。

*tag dispatch*方法是将对外接口定义为分发函数，分发函数负责判断输入类型是否适合作为通用引用形参函数版本的输入，再根据判断结果执行对应的实现函数。这里的关键是如何用类型来表示`true`和`false`含义，以下是一个具体案例：

```cpp
// 客户端可能会输入std::string或其它可转换为std::string的参数
// 客户端也可以输入一个索引值，函数可通过索引值找到对应的名字
template<typename T>
void logAndAdd(T&& name)	//分发函数
{
    // 判断输入类型是否为整型
    logAndAddImpl(
        std::forward<T>(name),
        std::is_integral<typename std::remove_reference<T>::type>()
    );
}

// 若不是整型则可以调用通用引用形参的函数版本
template<typename T>
void logAndAddImpl(T&& name, std::false_type)
{
    auto now = std::chrono::system_clock::now();
    log(now, "logAndAdd");
    names.emplace(std::forward<T>(name));
}

// 若是整型则调用接收整型的版本
std::string nameFromIdx(int idx);
void logAndAddImpl(int idx, std::true_type)
{
  logAndAdd(nameFromIdx(idx)); 
}
```

模板约束方法有两种，第一种是书中介绍的`std::enable_if<>`，该方法是在C++20之前使用的模板约束方法，它利用了机制：*Substitution Failure Is Not An Error(SFINAE)*，当模板类型参数替换失败时，不是报错，而是将该模板从重载候选集中移除。`std::enable_if<>`的语法：

```cpp
// 也可以使用std::enable_if_t<>(C++14)，其中T可选，默认为void
std::enable_if<true, T>::type	//会返回类型T
std::enable_if<false, T>::type	//类型不存在
```

因此当`std::enable_if<>`结果为不存在类型时，就会触发类型参数替换失败，从而移除模板，因此`std::enable_if<>`能放在三处地方：

```cpp
//放在模板参数列表中
template<typename T, typename = std::enable_if_t<std::is_integral_v<T>>
>
void foo(T value);

//放在函数返回类型上
template<typename T>
std::enable_if_t<std::is_integral_v<T>, void>
foo(T value);

//放在函数参数中（较少见）
template<typename T>
void foo(T value, std::enable_if_t<std::is_integral_v<T>,int> = 0);
```

第二种是C++20之后的`concept`和`requires`关键字，其中`concept`表示定义一个约束并命名，后面用约束名修饰模板类型参数来表示约束；`requires`则是直接写出模板参数的约束。这两个关键字相比`std::enable_if`使用要更加简洁方便。以下是使用案例：

```cpp
// concept使用
template<typename T>
concept Integral = std::is_integral_v<T>

template<Integral T>
void foo(T value);

//requires使用
template<typename T>
requires std::is_integral_v<T>
void foo(T value);

//requires的另一种使用，配合concept定义约束规则
template<typename T>
concept Addable = requires(T a, T b)
{
    a + b;	//Addable约束要求类型支持相加功能
};
```

### 完美转发失败情况讨论（*Item30*）

完美转发是指将一个函数形参传递给另一个函数，其中第二个函数收到的是与第一个函数收到的完全相同（包括类型、左右值属性、`const`属性等）的对象。完美转发失败是指**将形参直接传递给目标函数**和**将形参传递给转发函数，转发函数再转发给目标函数**，两种情况中的目标函数会执行不同的操作。接下来会讨论完美转发失败的情况。

第一个是实参为花括号初始化的情况：

```cpp
template<typename... Ts>
void fwd(Ts&&... params)	//转发函数
{
    f(std::forward<Ts>(params)...);
}

void f(const std::vector<int>& v); //目标函数

f({1, 2, 3});	//允许，{1, 2, 3}转换为std::vector<int>临时对象
fwd({1, 2, 3}); //报错，通用引用无法推导出花括号初始化类型
```

在`auto`关键字那一部分提到，模板是无法推导花括号初始化的类型的，但是`auto`关键字是会自动推导为`std::initializer_list`类型，因此该情况的解决方法也可以用：

```cpp
auto il = {1, 2, 3};
fwd(il);
```

第二个是实参为`0`或`NULL`来作为空指针传入的情况。因为会在类型推导中推导为整型类型，无法完美转发给接收指针类型的目标函数。解决办法是使用`nullptr`。

第三个是将类内的仅有声明的整型`static const`数据成员作为实参的情况。具体案例如下：

```cpp
class Widget {
public:
    // 此处仅仅是声明+初始化，并不算定义
    static const std::size_t MinVals = 28;
    …
}

//此时才算定义，会为该变量留存储空间。不需要再初始化。
const std::size_t Widget::MinVals;
```

没有定义的`static const`数据成员因为没有存储空间，也就无法使用它的引用和指向它的指针。因此在传递给转发函数时会出现报错，但是直接传递给目标函数时，编译器会直接将`MinVals`变量替换为28，因此不会报错。不过在C++17之后，直接为`static const`数据成员声明前面加上`inline`即可完成声明+定义。

第四个是将具有重载版本的函数名称或函数模板名称作为函数指针实参的情况。当直接传递给目标函数时，编译器可以通过目标函数定义的形参类型来判断选择哪个重载版本或实例化该函数模板版本，但是当传递给转发函数时，通用引用无法确定该推导成哪一个版本。解决办法是在传递给转发函数时，将函数名称转换为特定函数指针对象或者进行类型转换`static_cast<>`。

第五个是将位域类型变量作为实参的情况。具体案例如下：

```cpp
struct IPv4Header {
    std::uint32_t version:4,
                  IHL:4,
                  DSCP:6,
                  ECN:2,
                  totalLength:16;
    …
};
IPv4Header h;
//目标函数
void f(std::size_t sz);

f(h.totalLength);	//合法，接收位域实参的函数都将接收位域的副本
fwd(h.totalLength); //报错，通用引用无法推导位域类型
auto length = static_cast<std::uint16_t>(h.totalLength);
fwd(length);	//拷贝一个包含位域值的副本对象，再传给fwd
```

### 移动操作可能存在的问题（*Item29*）

作者在这一节主要想表达：不要理所当然的认为所有移动操作都会比拷贝操作更合适。一方面，有时代码显示为移动操作，但实际上是在做拷贝操作（例如对象所属类不提供移动操作、移动操作没有`noexcept`等）；另一方面，有些容器的移动操作并不会有优势，比如像`std::array`不使用堆内存的容器，触发小字符串优化（SSO）的`std::string`对象也不会使用堆内存存储。因此对一些“意外情况”要有所了解，才好得心应手的使用移动操作。

## *lambda*表达式

*lambda*表达式的代码形式包括用于捕获的`[]`，用于列出形参列表的`()`和函数体`{}`。以下是一个*lambda*表达式：

```cpp
auto enclosure = [](int val){ return 0 < val && val < 10; }
```

*lambda*表达式会创建**闭包对象**，当*lambda*表达式作为实参传给函数时，函数接收到的就是这个闭包对象。若捕获了外部变量，则该闭包对象就会持有捕获数据的副本或者引用。**闭包类**则是实例化闭包对象的类，每个*lambda*都会使编译器生成唯一的闭包类，而*lambda*的函数体就可以看成是该闭包类的成员函数，需要注意的是**该成员函数默认是`const`的**，即函数体中是不能修改按值捕获的变量的，除非在*lambda*表达式中声明为`mutable`。关于*lambda*表达式会讨论三点主题。

首先是`auto&&`形参的使用。在C++14中*lambda*表达式可以设置类型为`auto&&`的形参，起到通用引用的作用，而在函数体中想要使用完美转发时，则要通过使用`decltype`结合形参名字来给`std::forward`传递类型参数（*Item33*）。这一点在本文的右值引用和通用引用那一节有所提及。

第二点是*lambda*表达式的捕获能力。捕获模式分为按引用捕获和按值捕获，可使用`[=]`或`[&]`来表示默认按值捕获或默认按引用捕获，此时*lambda*表达式的函数体中可以使用`lambda`表达式所在的作用域中的变量。也可以指明具体的函数名来表示*lambda*表达式的函数体中会用到哪些变量，例如：

```cpp
int a = 10;
int b = 20;
// 按值捕获a，按引用捕获b
auto f = [a, &b]() {
    std::cout << a << ", " << b << '\n';
};
```

作者建议要避免使用默认捕获模式（*Item31*），原因是默认捕获模式非常不直观，不能体现*lambda*表达式中会用到哪些变量。在使用按引用捕获或者对指针使用按值捕获时，如果被捕获变量的生命周期比捕获它的闭包对象的生命周期短，就会出现悬空问题。对于定义在全局空间的对象，*lambda*表达式可以直接在函数体中使用。另外，作者还举了一个有趣的例子：类的成员函数中的*lambda*表达式在函数体中使用了成员变量，在默认捕获情况下，*lambda*表达式实际上捕获的是对象的`this`指针，具体如下：

```cpp
class Widget {
public:
    … 
    void addFilter() const; 
private:
    int divisor;
};

void Widget::addFilter() const
{
    // 此处闭包对象按值捕获了this指针
    // 函数体中的divisor实际为this->divisor
    // 因此默认捕获模式容易产生“误会”
    filters.emplace_back(
        [=](int value) { return value % divisor == 0; }
    );
}
```

在C++14中引入了新的捕获方法：初始化捕获（通用*lambda*捕获）（*Item32*）。该捕获方式可以指定在*lambda*对应的闭包类中的数据成员名称和初始化该成员的表达式。这种方式让变量移动到闭包对象或是让闭包捕获临时对象变得可行，具体如下：

```cpp
auto pw = std::make_unique<Widget>(); 
// 将变量移动到闭包对象中，闭包类的数据成员名字为pw
auto func = [pw = std::move(pw)]
            { return pw->isValidated()
                     && pw->isArchived(); };
// 使用临时对象初始化闭包类中的数据成员
auto func = [pw = std::make_unique<Widget>()]
            { return pw->isValidated()
                     && pw->isArchived(); };
```

作者还介绍了如何在C++11中模拟这种初始化捕获方法。第一种是参考*lambda*表达式的闭包类和闭包对象的概念，自定义“闭包类”，并定义调用操作符`()`来模仿*lambda*表达式的初始化捕获。第二种就是使用`std::bind`来模拟，而`std::bind`也是要讨论的第三个主题。

`std::bind`接收的第一个实参是**可调用对象**，后续实参则表示要传递给该**可调用对象**的值。`std::bind`会返回一个函数对象（*bind*对象），*bind*对象会**保存传递给`std::bind`所有实参的副本**，这些副本不具备`const`属性，左值实参使用拷贝构造，右值实参使用移动构造。当调用*bind*对象时，会将存储的实参传递给之前`std::bind`接收的第一个实参——可调用对象，如果此时还有额外的实参传入，则是按引用传递，然后完美转发给可调用对象（会涉及到占位符使用）。在了解这些后，就可以理解以下使用`std::bind`如何模仿初始化捕获：

```cpp
// 模仿初始化捕获中将变量移动到闭包对象中
auto func =
    std::bind(
        [](const std::vector<double>& data)
        { /*使用data*/ },
        std::move(data)
    );

// 模拟捕获临时对象
auto func = std::bind(
                [](const std::unique_ptr<Widget>& pw)
                { return pw->isValidated()
                         && pw->isArchived(); },
                std::make_unique<Widget>()
            );
```

提及`std::bind`的目的是了解有这么一个函数，在`std::bind`和*lambda*表达式都可以使用时，还是优先考虑*lambda*表达式（*Item34*），因为*lambda*表达式会更加简单易读，而`std::bind`的特性就相对复杂了，例如传递给`std::bind`的实参是按值传递，而调用*bind*对象时传递的实参则是按引用传递等。
