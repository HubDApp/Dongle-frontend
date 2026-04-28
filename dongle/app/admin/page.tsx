"use client";

import { useState } from "react";
import { useWallet } from "@/context/wallet.context";

interface VerificationRequest {
  id: string;
  projectName: string;
  submittedBy: string;
  status: "pending" | "approved" | "rejected";
  timestamp: string;
}

const MOCK_REQUESTS: VerificationRequest[] = [
  { id: "req_1", projectName: "Lumina DEX", submittedBy: "GABC...1234", status: "pending", timestamp: "2024-03-20T10:00:00Z" },
  { id: "req_2", projectName: "Stellar Stake", submittedBy: "GDEF...5678", status: "pending", timestamp: "2024-03-21T14:30:00Z" },
  { id: "req_3", projectName: "Orbit NFT", submittedBy: "GHIJ...9012", status: "approved", timestamp: "2024-03-19T09:15:00Z" },
];

export default function AdminDashboard() {
  const { isConnected, publicKey } = useWallet();
  const [requests, setRequests] = useState<VerificationRequest[]>(MOCK_REQUESTS);
  const [fee, setFee] = useState(1.5);

  // Derive admin status directly — no effect needed
  const isAdmin = isConnected && Boolean(publicKey);

  const handleAction = (id: string, status: "approved" | "rejected") => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status } : req
    ));
  };

  const handleSaveFee = () => {
    alert(`Fee updated to ${fee} XLM`);
  };

  if (!isAdmin) {
    return (
        <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center text-center min-h-screen">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 1a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Access Restricted</h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Please connect an authorized admin wallet to access this dashboard.
          </p>
        </div>
    );
  }

  return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-black mb-2 tracking-tight">ADMIN DASHBOARD</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Manage ecosystem verification and system parameters.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content: Requests */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-8 bg-purple-500 rounded-full" />
                Verification Requests
              </h2>
              
              <div className="space-y-4">
                {requests.map(req => (
                  <div 
                    key={req.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-lg"
                  >
                    <div>
                      <h3 className="font-bold text-lg mb-1">{req.projectName}</h3>
                      <p className="text-xs text-zinc-500 font-mono">Submitted by: {req.submittedBy}</p>
                      <div className="mt-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                          req.status === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500" :
                          req.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500" :
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500"
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    </div>

                    {req.status === "pending" && (
                      <div className="flex gap-2 w-full md:w-auto">
                        <button
                          onClick={() => handleAction(req.id, "approved")}
                          className="flex-1 md:flex-none px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(req.id, "rejected")}
                          className="flex-1 md:flex-none px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar: Settings */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-8 bg-blue-500 rounded-full" />
                System Settings
              </h2>
              
              <div className="bg-zinc-950 text-white p-8 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all" />
                
                <h3 className="text-lg font-bold mb-6">Verification Fee</h3>
                <div className="space-y-4">
                  <div className="flex items-end gap-3">
                    <input
                      type="number"
                      value={fee}
                      onChange={(e) => setFee(parseFloat(e.target.value))}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-2xl font-black w-full outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xl font-bold mb-3">XLM</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    This fee is charged to projects when they submit a verification request.
                  </p>
                  <button
                    onClick={handleSaveFee}
                    className="w-full py-4 bg-white text-black rounded-2xl font-black hover:bg-zinc-200 transition-colors"
                  >
                    UPDATE FEE
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
                <h3 className="font-bold mb-4">Stats Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Active</div>
                    <div className="text-2xl font-black">24</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Queue</div>
                    <div className="text-2xl font-black">12</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
