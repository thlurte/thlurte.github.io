---
title: "Allocation, Construction, and Raw Memory in C++"
description: A simplified walk through of how C++ turns raw memory into objects — new, operator new, placement new, <memory> helpers, and why destroy ≠ deallocate.
pubDate: 2026-07-05
image: /paintings/raii-in-high-performance-cpp.jpg
tags: ['cpp', 'hpc']
draft: false
---

> *"An object is not a block of memory. It is a typed interpretation of bytes, with a lifetime the language tracks separately from the heap."*

---

## What an Object Actually Is

An object in memory is simply a contiguous block of raw bytes that the compiler interprets strictly according to the layout of its specific type. The bytes themselves are inert. Until construction finishes, there is no living `User`, no `VectorNode`, no invariant worth trusting — only storage that *could* become one of those things.

That distinction is easy to blur in everyday C++. A `User*` returned from `malloc` or `operator new` looks like a typed pointer, but it does not mean initialized `User` objects exist at that address. The type on the pointer is a promise about layout and alignment. Construction is what turns the promise into an object.

This essay separates four steps that `new` and `delete` usually glue together:

1. **Allocate** — obtain raw bytes
2. **Construct** — start an object's lifetime in those bytes
3. **Destroy** — end the object's lifetime
4. **Deallocate** — return the bytes to the allocator

Once you can see those steps apart, the rest of the language's lifetime machinery — `<memory>`, placement new, overloaded `operator new` — stops looking like folklore and starts looking like deliberate tools.

---



## The `<memory>` Toolkit for Uninitialized Storage

The `<memory>` header provides methods to manage the lifetime of objects, especially when you already hold raw storage and need to create or tear down objects without going through the coupled `new` / `delete` expressions.

### Filling slots by copy-construction

`std::uninitialized_fill_n()` takes a starting raw pointer, a count of objects to create, and a value to copy into each of those slots. It expects a value of type `T` as its third argument because it needs something it can call the **copy constructor** on to fill every single slot. No living objects exist in the range beforehand; after the call, they do.

```cpp
#include <cstdlib>
#include <memory>
#include <string>

struct User {
    std::string name;
    explicit User(std::string n) : name(std::move(n)) {}
};

void* raw_block = std::malloc(3 * sizeof(User));
User* array_ptr = static_cast<User*>(raw_block);

std::uninitialized_fill_n(array_ptr, 3, User{"John"});
// three User objects now live in the block
```

The cast from `void*` to `User*` does not construct anything. `uninitialized_fill_n` does — three times, by copy-constructing from the temporary `User{"John"}`.

### Constructing one object in place

`std::construct_at` performs **in-place object construction** at a specific memory address. You pass the address and the constructor arguments; the function builds the object there.

```cpp
void* raw = std::malloc(sizeof(User));
User* user = static_cast<User*>(raw);
std::construct_at(user, "John"); // constructs User at *user
```

You can also pass a temporary and rely on the copy or move constructor:

```cpp
void* raw = std::malloc(sizeof(User));
User* user = static_cast<User*>(raw);
std::construct_at(user, User{"John"});
```

Both forms end the same way: a fully initialized `User` at `*user`. The first forwards constructor arguments; the second materializes a temporary and constructs from it. Prefer the first when you can — fewer temporaries, same result.

### Ending a lifetime explicitly

`std::destroy_at(p)` takes a pointer `p` to a fully initialized object and explicitly calls its destructor (`p->~T()`). It does not free memory. After `destroy_at`, the object is gone; the bytes may still be yours to reuse or return to the heap.

That last sentence is the essay's recurring theme. Destruction ends a lifetime. Deallocation returns storage. Confusing them is how leaks — and worse, use-after-lifetime bugs — appear.

---



## Everyday `new` / `delete`: Two Jobs, One Keyword

One of the usual ways to instantiate an object in memory is with `new`. The expression looks simple because it hides two jobs: **allocation** and **construction**. Once the object is instantiated, `new` returns an initialized typed pointer to the memory location where the data resides.

Under the hood, it calls `operator new` to request raw bytes from the heap — that is the allocation step — then runs the constructor in that storage. Any object you instantiate with `new` should be manually destroyed with a matching `delete` (or `delete[]` for arrays).

```cpp
#include <iostream>

struct MyClass {
    MyClass() { std::cout << "Constructor\n"; }
    ~MyClass() { std::cout << "Destructor\n"; }
};

int main() {
    MyClass* arr = new MyClass[3]; // allocate + construct × 3
    delete[] arr;                  // destroy × 3 + deallocate
    return 0;
}
```

The single-object form is the same idea with less ceremony:

```cpp
class VectorNode {
    float data[128];
public:
    VectorNode() { /* initialization */ }
};

VectorNode* node = new VectorNode();
// ...
delete node;
```

This is the *coupled* API. It is correct when you want the heap to own both the bytes and the lifetime together. The next sections uncouple those jobs, which is what containers, arenas, and custom allocators need.

---



## `operator new`: Allocation Without Construction

`operator new` is the allocation primitive. In its simplest form it takes a single integer argument: the number of bytes requested. During compilation, the compiler calculates `sizeof(T)` and hardcodes that raw integer into the call site when you write something like `operator new(sizeof(Node))`.

```cpp
void* raw_bytes = operator new(sizeof(Node));
```

What you get back is raw storage — not a `Node`. You cannot use the `delete` expression to destroy “the object” the way you do with a value produced by ordinary `new`, because no object lifetime has started yet. You return the block with `operator delete`:

```cpp
operator delete(raw_bytes);
```

A minimal global allocator sketch makes the contract obvious:

```cpp
#include <cstdlib>
#include <new>

auto operator new(std::size_t size) -> void* {
    void* p = std::malloc(size);
    if (!p) throw std::bad_alloc();
    return p;
}
```

(Real programs should also provide matching `operator delete` overloads; the point here is the shape of the call: bytes in, `void*` out, no constructors.)

### Overloading the array allocator

Classes can overload `operator new[]` and `operator delete[]` to observe or redirect array allocation:

```cpp
#include <iostream>
#include <cstdlib>
#include <new>

class CustomAlloc {
public:
    static void* operator new[](std::size_t size) {
        std::cout << "Overloaded new[]: requesting " << size << " bytes\n";
        void* ptr = std::malloc(size);
        if (!ptr) throw std::bad_alloc();
        return ptr;
    }

    static void operator delete[](void* ptr) noexcept {
        std::cout << "Overloaded delete[]: freeing memory\n";
        std::free(ptr);
    }

    CustomAlloc() {}
    ~CustomAlloc() {}
};

int main() {
    CustomAlloc* p = new CustomAlloc[5];
    delete[] p;
    return 0;
}
```

When a class overloads allocation and you specifically need the global operator instead, write `::new`. The leading `::` bypasses the class-scoped overload and goes straight to the global allocator.

---



## Placement New: Construction Without Allocation

Placement new does zero memory allocation. It focuses on creating the object in the given memory space with the correct type:

```cpp
Node* my_node = new (raw_bytes) Node();
```

The parentheses before the type name carry the address. Construction runs there; the allocator is not consulted.

To destroy an object initialized with placement new, call the destructor of that object — not a `delete` expression. `delete` would attempt to deallocate storage through an allocator path that may not match how the bytes were obtained, and it assumes a lifetime that you are ending by hand:

```cpp
node->~VectorNode();
```

`std::destroy_at(node)` is the same idea with a clearer name.

### The two failure modes

If you destroy the object but do not deallocate the memory you acquired with `new T[]` or `operator new`, the raw block is permanently leaked.

If you deallocate the raw memory acquired via `operator new` but did not destroy the object, any heap memory the object itself owns — strings, vectors, nested allocations — is permanently leaked, and you have ended storage while a lifetime may still be notionally active.

Destroying the object does **not** mean you are deallocating the memory used to allocate it. Those are separate obligations. Miss either one and something is wrong; miss the destroy step while freeing bytes and you may also be wrong in ways sanitizers take personally.

---



## Closing the Loop: Full Recipes

Here are three complete patterns. Each allocates storage one way, constructs with placement new, destroys explicitly, then returns the storage with the matching deallocator.

### 1. `operator new` / `operator delete`

```cpp
void* raw_memory = operator new(sizeof(VectorNode));

VectorNode* node = new (raw_memory) VectorNode();

node->~VectorNode();

operator delete(raw_memory);
```



### 2. `char` buffer via `new[]` / `delete[]`

```cpp
char* memory_pool = new char[sizeof(VectorNode)];

VectorNode* node = new (memory_pool) VectorNode();

node->~VectorNode();

delete[] memory_pool;
```

The buffer is an array of `char` (or `std::byte`). You destroy the `VectorNode`, then delete the buffer as the array it actually is.

### 3. `malloc` / `free`

```cpp
void* raw = std::malloc(sizeof(VectorNode));
if (!raw) throw std::bad_alloc();

VectorNode* node = new (raw) VectorNode();

node->~VectorNode();
std::free(raw);
```

`malloc` pairs with `free`. Leaving out `free` after the destructor call is the incomplete recipe that quietly leaks the block.

In all three cases the middle is the same: placement new starts the lifetime; an explicit destructor call ends it; only then do you hand the bytes back.

That is the whole model in miniature. **Allocate** bytes, **construct** an object in them, **destroy** the object when you are done, **deallocate** the bytes with the allocator that gave them to you. Ordinary `new` / `delete` hide the pairing. Once you split the jobs yourself, the pairing is your responsibility — and matching each step to its counterpart is what keeps raw memory honest.