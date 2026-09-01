const fs = require('fs');
let code = fs.readFileSync('Users.tsx', 'utf8');

// 1. Add MODULE_REGISTRY import
code = code.replace(
  "import api from '../api/axios';",
  "import api from '../api/axios';\nimport { MODULE_REGISTRY } from '../store/windowStore';"
);

// 2. Update AppUser interface
code = code.replace(
  "password?: string;",
  "password?: string;\n  modules?: string[];"
);

// 3. Add modules state
code = code.replace(
  "const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');",
  "const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');\n  const [selectedModules, setSelectedModules] = useState<string[]>([]);"
);

// 4. Update openNewModal
code = code.replace(
  "setStatus('Active');\n    setShowModal(true);",
  "setStatus('Active');\n    setSelectedModules(['dashboard', 'pos']);\n    setShowModal(true);"
);

// 5. Update openEditModal
code = code.replace(
  "setStatus(u.status);\n    setShowModal(true);",
  "setStatus(u.status);\n    setSelectedModules(u.modules || []);\n    setShowModal(true);"
);

// 6. Update handleSave PUT
code = code.replace(
  "password: password ? password : undefined \n        });",
  "password: password ? password : undefined,\n          modules: selectedModules\n        });"
);

// 7. Update handleSave POST
code = code.replace(
  "await api.post('/users', { username, password, full_name: fullName, role });",
  "await api.post('/users', { username, password, full_name: fullName, role, modules: selectedModules });"
);

// 8. Add Checkboxes UI before the buttons
const checkboxesUI = `
              <div>
                <label className="block text-sm font-semibold mb-2">Module Access</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2 border border-border rounded-lg bg-slate-50/50">
                  {Object.entries(MODULE_REGISTRY).map(([key, def]) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-primary focus:ring-primary/50"
                        checked={selectedModules.includes(key)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedModules([...selectedModules, key]);
                          else setSelectedModules(selectedModules.filter(m => m !== key));
                        }}
                      />
                      {def.title}
                    </label>
                  ))}
                </div>
              </div>
`;
code = code.replace(
  '<div className="flex justify-end gap-3 pt-4 border-t border-border">',
  checkboxesUI + '\n              <div className="flex justify-end gap-3 pt-4 border-t border-border">'
);

fs.writeFileSync('Users.tsx', code);
console.log('Users.tsx modified successfully');
