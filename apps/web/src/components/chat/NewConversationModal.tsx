import { getAssetUrl, getSocketUrl } from '../../api/client';
import React, { useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';

interface Employee {
  id: string;
  name: string;
  department: string;
  photoUrl: string | null;
}

interface Props {
  onClose: () => void;
}

const NewConversationModal = ({ onClose }: Props) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { fetchConversations, setActiveConversation } = useChat();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('hrms_token');
        // Fetch from the new chat endpoint to bypass HR/Admin restriction
        const res = await fetch(getSocketUrl('/chat/users'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);
        }
      } catch (err) {
        console.error('Failed to fetch employees', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleSelect = async (employeeId: string) => {
    try {
      const token = localStorage.getItem('hrms_token');
      const res = await fetch(getSocketUrl('/chat/conversations/direct'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ partnerId: employeeId }),
      });
      if (res.ok) {
        const conv = await res.json();
        await fetchConversations();
        setActiveConversation(conv.id);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create conversation', err);
    }
  };

  const filtered = employees.filter((e) => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">New Message</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search people..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1">
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No matching employees found</div>
            ) : (
              filtered.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleSelect(emp.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-colors group"
                >
                  {emp.photoUrl ? (
                    <img src={getAssetUrl(emp.photoUrl)} alt="" className="w-10 h-10 rounded-full object-cover group-hover:shadow-md transition-shadow" />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-full flex items-center justify-center font-bold group-hover:shadow-md transition-shadow">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-800">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.department || 'Employee'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;
