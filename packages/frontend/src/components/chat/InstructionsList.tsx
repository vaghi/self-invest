import { Trash2 } from 'lucide-react';
import { useChatStore } from '../../stores/chat.store';

export function InstructionsList() {
  const { instructions, toggleInstruction, deleteInstruction } = useChatStore();

  if (instructions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-gray-500 text-center">
          No instructions yet. Tell the agent your trading rules in the chat tab.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {instructions.map((inst) => (
        <div key={inst.id} className={`rounded-lg border p-3 space-y-2 ${
          inst.status === 'active' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-900/30 border-gray-800 opacity-60'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gray-200 font-medium">{inst.compactRule}</p>
            <button
              onClick={() => deleteInstruction(inst.id)}
              className="text-gray-600 hover:text-red-400 transition flex-shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              inst.category === 'avoid' ? 'bg-red-500/20 text-red-400' :
              inst.category === 'prefer' ? 'bg-green-500/20 text-green-400' :
              inst.category === 'constraint' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {inst.category}
            </span>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-[10px] text-gray-500">{inst.status === 'active' ? 'Active' : 'Off'}</span>
              <button
                onClick={() => toggleInstruction(inst.id, inst.status !== 'active')}
                className={`relative w-9 h-5 rounded-full transition ${
                  inst.status === 'active' ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  inst.status === 'active' ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </label>
          </div>

          <p className="text-[10px] text-gray-600 truncate" title={inst.originalMessage}>
            "{inst.originalMessage}"
          </p>
        </div>
      ))}
    </div>
  );
}
