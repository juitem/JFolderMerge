#!/bin/bash
mkdir -p test/A/src test/B/src
mkdir -p test/A/assets test/B/assets
mkdir -p test/A/empty_dir test/B/empty_dir

# 1. Python Code Diff
cat <<EOF > test/A/src/calc.py
def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

def multiply(a, b):
    return a * b
EOF

cat <<EOF > test/B/src/calc.py
def add(a, b):
    # Adding two numbers
    print(f"Adding {a} + {b}")
    return a + b

def sub(a, b):
    return a - b

def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b
EOF

# 2. CSS Style Diff
cat <<EOF > test/A/assets/style.css
body {
    background-color: #fff;
    color: #333;
    font-size: 16px;
}

.header {
    margin-bottom: 20px;
}
EOF

cat <<EOF > test/B/assets/style.css
body {
    background-color: #1a1a1a; /* Dark mode */
    color: #f0f0f0;
    font-size: 14px; /* Reduced font size */
}

.header {
    margin-bottom: 24px;
    padding: 10px;
}

.footer {
    margin-top: 50px;
}
EOF

# 3. JSON/Config Diff
cat <<EOF > test/A/config.json
{
    "version": "1.0.0",
    "debug": true,
    "features": {
        "auth": true,
        "logging": false
    }
}
EOF

cat <<EOF > test/B/config.json
{
    "version": "1.0.1",
    "debug": false,
    "features": {
        "auth": true,
        "logging": true,
        "metrics": true
    }
}
EOF

# 4. Long File for Scrolling
for i in {1..100}; do echo "Line $i: Content for verification" >> test/A/long_file.txt; done
for i in {1..100}; do
    if [ $((i % 10)) -eq 0 ]; then
        echo "Line $i: MODIFIED CONTENT HERE <<<<<" >> test/B/long_file.txt
    else
        echo "Line $i: Content for verification" >> test/B/long_file.txt
    fi
done

# 5. Only in A / Only in B
echo "This file is only in A" > test/A/only_in_a.md
echo "This file is only in B" > test/B/only_in_b.md
