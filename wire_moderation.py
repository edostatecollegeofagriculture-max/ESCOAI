from pathlib import Path

cms_path = Path("src/components/ContentManagementModule.tsx")
content = cms_path.read_text(encoding="utf-8")

if "import { ResultModerationTab }" not in content:
    import_anchor = "import { RegistrationApprovalTab } from './RegistrationApprovalTab';"
    if import_anchor in content:
        content = content.replace(import_anchor, import_anchor + "\nimport { ResultModerationTab } from './ResultModerationTab';")
        print("[PASS] Added import")
    else:
        # Add after some other import
        last_import = content.rfind("import ")
        end_of_last = content.find("\n", last_import)
        content = content[:end_of_last+1] + "import { ResultModerationTab } from './ResultModerationTab';\n" + content[end_of_last+1:]
        print("[PASS] Added import (fallback)")

if "'moderation'" not in content:
    # Find the Tab type
    type_match = content.find("type Tab = ")
    if type_match != -1:
        end_type = content.find(";", type_match)
        old_type = content[type_match:end_type]
        new_type = old_type.replace("'documents'", "'moderation' | 'documents'")
        content = content[:type_match] + new_type + content[end_type:]
        print("[PASS] Added 'moderation' to Tab type")

if "{ id: 'moderation', label: 'Result Moderation' }" not in content:
    if "{ id: 'registrations', label: 'Course Registrations' }," in content:
        content = content.replace(
            "{ id: 'registrations', label: 'Course Registrations' },",
            "{ id: 'registrations', label: 'Course Registrations' },\n    { id: 'moderation', label: 'Result Moderation' },"
        )
        print("[PASS] Added tab to array")

if "activeTab === 'moderation' && <ResultModerationTab />" not in content:
    if "{activeTab === 'registrations' && <RegistrationApprovalTab />}" in content:
        content = content.replace(
            "{activeTab === 'registrations' && <RegistrationApprovalTab />}",
            "{activeTab === 'registrations' && <RegistrationApprovalTab />}\n          {activeTab === 'moderation' && <ResultModerationTab />}"
        )
        print("[PASS] Added render block")

cms_path.write_text(content, encoding="utf-8")
print("Done.")
