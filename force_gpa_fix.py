from pathlib import Path

student_path = Path("src/views/StudentPortal.tsx")
lines = student_path.read_text(encoding="utf-8").splitlines()

# We need to find where the JSX render starts, usually `return (`
insert_index = -1
for i, line in enumerate(lines):
    if line.strip().startswith("return ("):
        insert_index = i
        break

if insert_index == -1:
    print("[FAIL] Could not find 'return (' in StudentPortal.tsx")
    exit()

# Check if gpaData is already there (to avoid duplicates)
# We look in the 20 lines before the return statement
already_exists = False
for i in range(max(0, insert_index - 20), insert_index):
    if "const gpaData = calculateGPA();" in lines[i]:
        already_exists = True
        break

if already_exists:
    print("[SKIP] gpaData logic already exists in the file.")
    exit()

# The logic to inject
gpa_logic = """  const calculateGPA = () => {
    if (!results || results.length === 0) return { gpa: 'N/A', credits: 0 };
    const approvedResults = results.filter((r: any) => r.status === 'APPROVED' || r.status === 'PUBLISHED');
    if (approvedResults.length === 0) return { gpa: 'N/A', credits: 0 };

    let totalPoints = 0;
    let totalCredits = 0;

    approvedResults.forEach((r: any) => {
      const gradePoints: Record<string, number> = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0 };
      const point = gradePoints[r.grade] || 0;
      const credits = r.creditUnits || 3;
      totalPoints += (point * credits);
      totalCredits += credits;
    });

    if (totalCredits === 0) return { gpa: 'N/A', credits: 0 };
    return { gpa: (totalPoints / totalCredits).toFixed(2), credits: totalCredits };
  };

  const gpaData = calculateGPA();
"""

# Insert the logic right before the return statement
lines.insert(insert_index, gpa_logic)

student_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"[PASS] Successfully injected gpaData logic at line {insert_index + 1}.")