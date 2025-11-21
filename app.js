// ========================================
// ARQUIVO: app.js (VERSÃO FINAL CORRIGIDA)
// ========================================

const { useState, useEffect } = React;

// ========================================
// 🔥 CONFIGURAÇÃO DO FIREBASE
// SUBSTITUA COM SUAS CREDENCIAIS!
// ========================================
const firebaseConfig = {
  apiKey: "AIzaSyAchvMwL3Rhc0pqOIaSr5ipeYs4jIj7Agk",
  authDomain: "pagamento-b72c8.firebaseapp.com",
  projectId: "pagamento-b72c8",
  storageBucket: "pagamento-b72c8.firebasestorage.app",
  messagingSenderId: "897682968980",
  appId: "1:897682968980:web:b7f37a70edb1a6d74dbf81"
};

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ========================================
// ÍCONES SVG
// ========================================
const CopyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const RefreshIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
function PagamentosManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // Carregar do Firestore + Listener em tempo real
  useEffect(() => {
    loadData();
    
    const unsubscribe = db.collection('pagamentos')
      .orderBy('ordem', 'desc') // Ordenar do mais recente para o mais antigo
      .onSnapshot((snapshot) => {
        const data = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        
        if (data.length > 0) {
          setRows(data);
          setLastSync(new Date());
        } else if (!loading) {
          setRows([createEmptyRow()]);
        }
      }, (error) => {
        console.error('Erro no listener:', error);
      });

    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      const snapshot = await db.collection('pagamentos')
        .orderBy('ordem', 'desc') // Ordenar do mais recente para o mais antigo
        .get();
      
      const data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      setRows(data.length > 0 ? data : [createEmptyRow()]);
      setLastSync(new Date());
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setRows([createEmptyRow()]);
    } finally {
      setLoading(false);
    }
  };

  const saveRow = async (row) => {
    try {
      setSyncing(true);
      
      if (row.id.toString().includes('temp')) {
        const newId = Date.now().toString();
        await db.collection('pagamentos').doc(newId).set({
          ...row,
          id: newId,
          ordem: Date.now()
        });
      } else {
        await db.collection('pagamentos').doc(row.id).update({
          data: row.data,
          informacoes: row.informacoes,
          crm: row.crm,
          dn: row.dn,
          nomeLoja: row.nomeLoja
        });
      }
      
      setLastSync(new Date());
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar os dados. Tente novamente.');
    } finally {
      setSyncing(false);
    }
  };

  const createEmptyRow = () => ({
    id: 'temp-' + Date.now() + Math.random(),
    data: '',
    informacoes: '',
    crm: false,
    dn: '',
    nomeLoja: '',
    ordem: Date.now()
  });

  const parseInformacoes = (text) => {
    const parts = text.split('-').map(p => p.trim());
    const dn = parts[4] || '';
    const nomeLoja = parts[5] || '';
    return { dn, nomeLoja };
  };

  // ========================================
  // CORRIGIDO: updateRow SEM criar linha automática
  // ========================================
  const updateRow = (id, field, value) => {
    setRows(prevRows => {
      const newRows = prevRows.map(row => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };
          
          if (field === 'informacoes') {
            const parsed = parseInformacoes(value);
            updatedRow.dn = parsed.dn;
            updatedRow.nomeLoja = parsed.nomeLoja;
          }
          
          // Salvar no Firestore quando linha estiver completa
          if (updatedRow.data && updatedRow.informacoes) {
            saveRow(updatedRow);
          }
          
          return updatedRow;
        }
        return row;
      });

      return newRows;
    });
  };

  // ========================================
  // NOVO: Adicionar linha no TOPO
  // ========================================
  const addNewRow = () => {
    setRows(prevRows => {
      const newRow = createEmptyRow();
      return [newRow, ...prevRows]; // Adiciona no início do array
    });
  };

  const clearRow = async (id) => {
    try {
      if (!id.toString().includes('temp')) {
        await db.collection('pagamentos').doc(id).delete();
      }
      
      setRows(prevRows => {
        const newRows = prevRows.filter(row => row.id !== id);
        if (newRows.length === 0) {
          newRows.push(createEmptyRow());
        }
        return newRows;
      });
      
      setLastSync(new Date());
    } catch (error) {
      console.error('Erro ao limpar linha:', error);
    }
  };

  const resetAll = async () => {
    if (confirm('⚠️ ATENÇÃO: Isso vai apagar TODOS os dados de TODOS os usuários! Tem certeza?')) {
      try {
        setSyncing(true);
        
        const snapshot = await db.collection('pagamentos').get();
        const batch = db.batch();
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        setRows([createEmptyRow()]);
        setLastSync(new Date());
        alert('✅ Todos os dados foram apagados!');
      } catch (error) {
        console.error('Erro ao limpar dados:', error);
        alert('Erro ao limpar os dados. Tente novamente.');
      } finally {
        setSyncing(false);
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Nunca';
    const now = new Date();
    const diff = Math.floor((now - lastSync) / 1000);
    
    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    return lastSync.toLocaleTimeString('pt-BR');
  };

  // ========================================
  // CORRIGIDO: Converter data para formato brasileiro
  // ========================================
  const formatDateToBR = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatDateToISO = (dateString) => {
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600 mb-4">Carregando dados do Firebase...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Sistema de Pagamentos</h1>
              <p className="text-gray-600">Gerencie seus pagamentos de forma simples e organizada</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <RefreshIcon />
                <span>Última sincronização: {formatLastSync()}</span>
              </div>
              {syncing && (
                <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Salvando...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-semibold w-32">Data</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold min-w-96">Informações</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold w-20">CRM</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold w-32">DN</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold w-48">Nome da Loja</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr 
                    key={row.id} 
                    className={`border-b hover:bg-gray-50 transition-colors ${
                      row.crm ? 'bg-green-50' : ''
                    }`}
                    style={row.crm ? { color: 'rgb(22, 163, 74)' } : {}}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={row.data}
                        onChange={(e) => updateRow(row.id, 'data', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        style={row.crm ? { color: 'rgb(22, 163, 74)' } : {}}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={row.informacoes}
                          onChange={(e) => updateRow(row.id, 'informacoes', e.target.value)}
                          placeholder="Nome - Proposta - Telefone - Data - Código - Loja"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          style={row.crm ? { color: 'rgb(22, 163, 74)' } : {}}
                        />
                        <button
                          onClick={() => copyToClipboard(row.informacoes)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Copiar"
                        >
                          <CopyIcon />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.crm}
                        onChange={(e) => updateRow(row.id, 'crm', e.target.checked)}
                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.dn}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm"
                        style={row.crm ? { color: 'rgb(22, 163, 74)' } : {}}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.nomeLoja}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm"
                        style={row.crm ? { color: 'rgb(22, 163, 74)' } : {}}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={addNewRow}
                          className="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                          title="Adicionar nova linha"
                        >
                          <PlusIcon />
                        </button>
                        <button
                          onClick={() => clearRow(row.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Limpar linha"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={resetAll}
            disabled={syncing}
            className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrashIcon />
            Reset Geral (Apaga Tudo!)
          </button>
          
          <button
            onClick={loadData}
            disabled={syncing}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshIcon />
            Recarregar Dados
          </button>
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm space-y-2">
          <p className="flex items-center justify-center gap-2">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            Conectado ao Firebase - Sincronização em tempo real
          </p>
          <p className="text-xs text-gray-500">
            Todos os usuários veem os mesmos dados automaticamente
          </p>
        </div>
      </div>
    </div>
  );
}

ReactDOM.render(<PagamentosManager />, document.getElementById('root'));
