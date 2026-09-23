# MyPandoc Renderer Test

This document is intended to exercise the main features of `blended-marked`.

---

## Basic Markdown

Normal paragraph with **bold text**, *italic text*, and `inline code`.

### Lists

* First item
* Second item

  * Nested item
  * Another nested item
* Third item

---

## Block Quote

> This is a block quote.

---

## Image

::: {.image-medium}

![Image](https://commons.wikimedia.org/wiki/Special:Redirect/file/Albert_Einstein_Head_cleaned.jpg)

:::

---

## Horizontal slide 2

Content

--

### Vertical slide 2.1

More detail

--

### Vertical slide 2.2

Even more detail
---

## Two-column layout

:::: {.two-col}

::: {.column}

Text links

:::

::: {.column}

![Image](https://commons.wikimedia.org/wiki/Special:Redirect/file/Albert_Einstein_Head_cleaned.jpg)

:::

::::


---

## Headings

# Heading level 1

## Heading level 2

### Heading level 3

#### Heading level 4

---

## Inline mathematics

Einstein:

\(E = mc^2\)

Using dollar syntax:

$E = mc^2$

A slightly more complicated expression:

\(f(x) = x^3 - 3x^2 - 9x + 27\)

Inline fraction:

\(\frac{a+b}{c+d}\)


---

## Display mathematics

Using dollar syntax:

$$
f(x) = x^3 - 3x^2 - 9x + 27
$$

Using LaTeX bracket syntax:

$$
\int_0^\infty e^{-x^2}\,dx
=
\frac{\sqrt{\pi}}{2}
$$

A matrix:

$$
A =
\begin{pmatrix}
1 & 2 \\
3 & 4
\end{pmatrix}
$$

---

## Mixed Markdown and mathematics

The quadratic equation

$$
ax^2 + bx + c = 0
$$

has the solutions

$$
x_{1,2}
=
\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}.
$$

This paragraph continues normally after the mathematics.

---

## Chemistry

\chemfig{C(-[:90]H)(-[:180]H)(-[:270]H)-[:0]H}

---

## Fenced div

::: {.important}

## Important section

This text should occur inside a `div` with class `important`.

It also contains mathematics:

$$
F = ma
$$
:::
