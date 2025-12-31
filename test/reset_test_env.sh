#!/bin/bash

# Ensure we are in the script's directory
cd "$(dirname "$0")"

# Define test directories (relative to this script)
LEFT_DIR="test_left"
RIGHT_DIR="test_right"

# 1. Cleanup existing directories
echo "Cleaning up old test directories..."
rm -rf "$LEFT_DIR" "$RIGHT_DIR"

# 2. Create directories
echo "Creating new test directories..."
mkdir -p "$LEFT_DIR"
mkdir -p "$RIGHT_DIR"
mkdir -p "$LEFT_DIR/only_in_a/sub/deep/dir"
mkdir -p "$RIGHT_DIR/only_in_b/another/deep/dir"
mkdir -p "$LEFT_DIR/deep/d1/d2/d3/d4/d5/d6/d7" "$RIGHT_DIR/deep/d1/d2/d3/d4/d5/d6/d7"
mkdir -p "$LEFT_DIR/many_files" "$RIGHT_DIR/many_files"
mkdir -p "$LEFT_DIR/deleted_files" "$RIGHT_DIR/added_files"

# Case 1: Simple Modification (Modified)
echo "Case 1: Simple Modification"
cat <<EOF > "$LEFT_DIR/case1_modify.txt"
Line 1: Keep this line.
Line 2: This is the ORIGINAL line.
Line 3: Keep this line too.
Line 4: Another common line.
Line 5: End of file.
EOF

cat <<EOF > "$RIGHT_DIR/case1_modify.txt"
Line 1: Keep this line.
Line 2: This is the MODIFIED line with different content.
Line 3: Keep this line too.
Line 4: Another common line.
Line 5: End of file.
EOF

# Case 2: Multi-Line Deletion (Removed Block)
echo "Case 2: Multi-Line Deletion"
cat <<EOF > "$LEFT_DIR/case2_delete.txt"
Start of file.
[REMOVE START]
Element 1: This item should be removed.
Element 2: This item is also unnecessary.
Element 3: Cleaning up the code.
Element 4: Removing legacy features.
[REMOVE END]
End of file.
EOF

cat <<EOF > "$RIGHT_DIR/case2_delete.txt"
Start of file.
End of file.
EOF

# Case 3: Multi-Line Addition (Added Block)
echo "Case 3: Multi-Line Addition"
cat <<EOF > "$RIGHT_DIR/case3_add.txt"
Start of file.
[ADD START]
Feature A: New capability added.
Feature B: Enhanced performance.
Feature C: Better user interface.
Feature D: Bug fixes included.
[ADD END]
End of file.
EOF

cat <<EOF > "$LEFT_DIR/case3_add.txt"
Start of file.
End of file.
EOF

# Case 4: Large Block Replacement (Tests Reject Replacement Logic)
echo "Case 4: Large Block Replacement"
cat <<EOF > "$LEFT_DIR/case4_replace.txt"
Common Header
function oldLogic() {
    console.log("This is the OLD implementation.");
    var x = 10;
    var y = 20;
    return x + y;
}
// Legacy comment 1
// Legacy comment 2
// Legacy comment 3
Common Footer
EOF

cat <<EOF > "$RIGHT_DIR/case4_replace.txt"
Common Header
function newLogic() {
    console.log("This is the NEW implementation.");
    const a = 100;
    const b = 200;
    return a * b;
}
// Modern comment A
// Modern comment B
// Modern comment C
Common Footer
EOF

# Case 5: Multi-Hunk (Alternating Changes for Navigation)
echo "Case 5: Multi-Hunk / Navigation Stress Test"
cat <<EOF > "$LEFT_DIR/case5_navigation.txt"
1. Common Start
2. [Left Only: Section A]
3. Common Middle 1
4. Common Middle 2
5. [Left Only: Section B]
6. Common End
EOF

cat <<EOF > "$RIGHT_DIR/case5_navigation.txt"
1. Common Start
2. [Right Only: Section X]
3. Common Middle 1
4. [Right Only: Section Y]
5. Common Middle 2
6. Common End
7. [Right Only: Footer Z]
EOF

# Case 6: Nested Folder Structure
echo "Case 6: Nested Folders"
mkdir -p "$LEFT_DIR/src/components"
mkdir -p "$RIGHT_DIR/src/components"

cat <<EOF > "$LEFT_DIR/src/components/Button.tsx"
import React from 'react';
// Old Button implementation
export const Button = () => <button>Click Me</button>;
EOF

cat <<EOF > "$RIGHT_DIR/src/components/Button.tsx"
import React from 'react';
// New Button implementation
export const Button = () => <button className="btn-primary">Click Me</button>;
EOF

# Case 7: Korean Text (UTF-8 Multi-line)
echo "Case 7: Korean Content"
cat <<EOF > "$LEFT_DIR/case7_korean.txt"
문서 제목: 구버전
1. 서론
   이 문서는 구버전의 내용을 담고 있습니다.
2. 본론
   오래된 데이터가 여기에 표시됩니다.
   - 항목 A
   - 항목 B
3. 결론
   구버전 문서 끝.
EOF

cat <<EOF > "$RIGHT_DIR/case7_korean.txt"
문서 제목: 신버전
1. 서론
   이 문서는 최신 버전의 내용을 담고 있습니다.
2. 본론
   최신 데이터가 업데이트 되었습니다.
   - 항목 A (수정됨)
   - 항목 B
   - 항목 C (추가됨)
3. 결론
   신버전 문서 끝.
EOF

# Case 8: Only Added / Only Removed (Smart Fallback Test)
mkdir -p "$LEFT_DIR/fallback"
mkdir -p "$RIGHT_DIR/fallback"

# 8a: Only Removed (Smart Fallback: Next Added -> Should go to Removed)
cat <<EOF > "$LEFT_DIR/fallback/only_removed.txt"
Common Line
Removed Line 1
Removed Line 2
Common Line
EOF
cat <<EOF > "$RIGHT_DIR/fallback/only_removed.txt"
Common Line
Common Line
EOF

# 8b: Only Added (Smart Fallback: Next Removed -> Should go to Added)
cat <<EOF > "$LEFT_DIR/fallback/only_added.txt"
Common Line
Common Line
EOF
cat <<EOF > "$RIGHT_DIR/fallback/only_added.txt"
Common Line
Added Line 1
Added Line 2
Common Line
EOF

# Case 9: Deep Directory (Depth 8)
echo "Case 9: Deep Directory"
echo "Deep file in Left" > "$LEFT_DIR/deep/d1/d2/d3/d4/d5/d6/d7/depth_8.txt"
echo "Deep file in Right" > "$RIGHT_DIR/deep/d1/d2/d3/d4/d5/d6/d7/depth_8.txt"
echo "Different in Right" >> "$RIGHT_DIR/deep/d1/d2/d3/d4/d5/d6/d7/depth_8.txt"

# Case 10: One-sided Folders
echo "Case 10: One-sided Folders"
echo "This file is only in Left" > "$LEFT_DIR/only_in_a.md"
echo "This file is only in Right" > "$RIGHT_DIR/only_in_b.md"
echo "Hidden in Left" > "$LEFT_DIR/only_in_a/sub/deep/dir/secret.txt"
echo "Hidden in Right" > "$RIGHT_DIR/only_in_b/another/deep/dir/secret.txt"

# Case 11: Many Files (50 more)
echo "Case 11: Many Files"
for i in {1..50}; do
    echo "Content for file $i" > "$LEFT_DIR/many_files/file_$i.txt"
    if [ $((i % 2)) -eq 0 ]; then
        echo "Content for file $i" > "$RIGHT_DIR/many_files/file_$i.txt"
    else
        echo "Modified content for file $i" > "$RIGHT_DIR/many_files/file_$i.txt"
    fi
done

# Case 12: Explicit Removed/Added Files in Shared Folders
echo "Case 12: Explicit Removed/Added Files"
echo "This file existed in Left but was deleted in Right" > "$LEFT_DIR/deleted_files/old_report.pdf"
echo "Another file only in Left" > "$LEFT_DIR/deleted_files/notes.txt"
echo "This file is brand new in Right" > "$RIGHT_DIR/added_files/new_feature.ts"
echo "Another new file in Right" > "$RIGHT_DIR/added_files/config_v2.json"

# Case 13: Long File (Scrolling Test)
echo "Case 13: Long File for Scrolling"
{
    for i in {1..200}; do
        if [ $i -eq 100 ]; then
            echo "Line $i: This is a MODIFIED line in the MIDDLE (Left)"
        elif [ $i -eq 200 ]; then
            echo "Line $i: This is a DELETED line at the END (Left)"
        else
            echo "Line $i: Common context line for scrolling test."
        fi
    done
} > "$LEFT_DIR/case13_long_scrolling.txt"

{
    for i in {1..200}; do
        if [ $i -eq 100 ]; then
            echo "Line $i: This is a MODIFIED line in the MIDDLE (Right)"
        elif [ $i -eq 200 ]; then
            # Line 200 is deleted in Left, so it exists and is different in Right? 
            # Actually let's make it a removal.
            echo "Line $i: This line survives only in Right."
        else
            echo "Line $i: Common context line for scrolling test."
        fi
    done
    echo "Line 201: Extra addition at the very bottom."
} > "$RIGHT_DIR/case13_long_scrolling.txt"

echo "Done! Created '$LEFT_DIR' and '$RIGHT_DIR' inside '$(pwd)'."
