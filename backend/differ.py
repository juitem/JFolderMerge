import difflib
from difflib import SequenceMatcher

def compute_diff(left_content: str, right_content: str, mode: str):
    if mode == "side-by-side":
        left_lines = left_content.splitlines()
        right_lines = right_content.splitlines()
        
        diff_gen = difflib.ndiff(left_lines, right_lines)
        
        left_rows = []
        right_rows = []
        
        removes_buffer = []
        adds_buffer = []

        def compute_line_diff(a, b):
            """Returns (left_segments, right_segments) for word-level highlighting"""
            sm = SequenceMatcher(None, a, b)
            left_segs = []
            right_segs = []
            
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag == 'equal':
                    seg_text = a[i1:i2]
                    left_segs.append({"text": seg_text, "type": "same"})
                    right_segs.append({"text": seg_text, "type": "same"})
                elif tag == 'replace':
                    left_segs.append({"text": a[i1:i2], "type": "removed"})
                    right_segs.append({"text": b[j1:j2], "type": "added"})
                elif tag == 'delete':
                    left_segs.append({"text": a[i1:i2], "type": "removed"})
                elif tag == 'insert':
                    right_segs.append({"text": b[j1:j2], "type": "added"})
                    
            return left_segs, right_segs

        def flush_buffers():
            nonlocal removes_buffer, adds_buffer
            common_len = min(len(removes_buffer), len(adds_buffer))
            
            # 1. Aligned "Modified" lines
            for i in range(common_len):
                l_obj = removes_buffer[i]
                r_obj = adds_buffer[i]
                
                l_text = l_obj["text"]
                r_text = r_obj["text"]
                
                # Compute sub-diff
                l_segs, r_segs = compute_line_diff(l_text, r_text)
                
                left_rows.append({"text": l_segs, "type": "modified", "line": l_obj["line"]})
                right_rows.append({"text": r_segs, "type": "modified", "line": r_obj["line"]})
                
            # 2. Remaining Removes (if any) -> Left only
            for i in range(common_len, len(removes_buffer)):
                l_obj = removes_buffer[i]
                left_rows.append({"text": l_obj["text"], "type": "removed", "line": l_obj["line"]})
                right_rows.append({"text": "", "type": "empty"}) # Spacer
                
            # 3. Remaining Adds (if any) -> Right only
            for i in range(common_len, len(adds_buffer)):
                left_rows.append({"text": "", "type": "empty"}) # Spacer
                r_obj = adds_buffer[i]
                right_rows.append({"text": r_obj["text"], "type": "added", "line": r_obj["line"]})
                
            del removes_buffer[:]
            del adds_buffer[:]

        # Line Counters (1-based)
        left_n = 1
        right_n = 1

        for line in diff_gen:
            code = line[:2]
            text = line[2:]
            
            if code == "- ":
                removes_buffer.append({"text": text, "line": left_n})
                left_n += 1
            
            elif code == "+ ":
                adds_buffer.append({"text": text, "line": right_n})
                right_n += 1
                
            elif code == "  ":
                # Context line, flush any pending changes
                flush_buffers()
                left_rows.append({"text": text, "type": "same", "line": left_n})
                right_rows.append({"text": text, "type": "same", "line": right_n})
                left_n += 1
                right_n += 1
                
            # ndiff does not produce '@@' headers
        
        # Final flush
        flush_buffers()
                
        return {"diff": [], "left_rows": left_rows, "right_rows": right_rows}

    # Unified Diff Mode
    diff = list(difflib.unified_diff(
        left_content.splitlines(), 
        right_content.splitlines(),
        fromfile='Left',
        tofile='Right',
        lineterm=''
    ))
    
    return {"diff": diff}
