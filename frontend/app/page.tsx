/**
 * Main Entry Page - Clinker DSS
 * 
 * This is the landing page that redirects to the 8-page workflow
 */

'use client';

import React from 'react';

export default function Home() {
  const pages = [
    {
      number: 1,
      title: 'Network Overview',
      description: 'Select IUs and GUs from 420 cement plants across India',
      layer: 'Allocation',
      color: 'blue',
    },
    {
      number: 2,
      title: 'Demand & Production',
      description: 'Input demand forecasts and production capacities',
      layer: 'Allocation',
      color: 'blue',
    },
    {
      number: 3,
      title: 'Allocation Optimization',
      description: 'Run MILP optimizer to determine WHAT goes WHERE and WHEN',
      layer: 'Allocation',
      color: 'blue',
    },
    {
      number: 4,
      title: 'Transportation Inputs',
      description: 'Configure transport modes, costs, and consolidation',
      layer: 'Transportation',
      color: 'green',
    },
    {
      number: 5,
      title: 'Transportation Optimization',
      description: 'Optimize HOW clinker moves physically',
      layer: 'Transportation',
      color: 'green',
    },
    {
      number: 6,
      title: 'Map Visualization',
      description: 'Interactive network visualization with flows',
      layer: 'Visualization',
      color: 'purple',
    },
    {
      number: 7,
      title: 'Cost Summary',
      description: 'Per-plant cost breakdown and KPIs',
      layer: 'Summary',
      color: 'orange',
    },
    {
      number: 8,
      title: 'Uncertainty Analysis',
      description: 'Scenario comparison and robustness analysis',
      layer: 'Decision Support',
      color: 'red',
    },
  ];

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 border-blue-300 text-blue-800',
      green: 'bg-green-100 border-green-300 text-green-800',
      purple: 'bg-purple-100 border-purple-300 text-purple-800',
      orange: 'bg-orange-100 border-orange-300 text-orange-800',
      red: 'bg-red-100 border-red-300 text-red-800',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-6 py-16 relative">
          <div className="text-center mb-12">
            <span className="inline-block mb-4 bg-blue-600/20 text-blue-300 border border-blue-500/30 px-4 py-1 rounded-full text-sm">
              Hack Innovate AIDTM – Challenge 2
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Clinker DSS
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-4">
              Allocation & Transportation Optimization System for the Indian Cement Industry
            </p>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Strategic supply chain optimization with two-layer architecture: 
              <span className="text-blue-400"> Allocation (WHAT/WHERE/WHEN)</span> and 
              <span className="text-green-400"> Transportation (HOW)</span>
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">420</div>
              <div className="text-slate-400 text-sm">Cement Plants</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">150</div>
              <div className="text-slate-400 text-sm">Integrated Units</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">270</div>
              <div className="text-slate-400 text-sm">Grinding Units</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">8</div>
              <div className="text-slate-400 text-sm">Workflow Pages</div>
            </div>
          </div>

          {/* Start Button */}
          <div className="text-center mb-16">
            <button
              onClick={() => window.location.href = '/page1'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-xl rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-105 font-semibold"
            >
              🚀 Start Optimization Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Pages */}
      <div className="bg-slate-900 py-16 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            8-Page Workflow
          </h2>
          <p className="text-slate-300 text-center mb-12 max-w-2xl mx-auto">
            Complete end-to-end optimization from network selection to final decision support
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pages.map(page => (
              <div 
                key={page.number} 
                className="bg-slate-800 border-2 border-slate-700 rounded-lg p-6 hover:shadow-lg hover:shadow-blue-500/20 transition-all hover:-translate-y-1 cursor-pointer hover:border-blue-500"
                onClick={() => window.location.href = `/page${page.number}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    {page.number}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getColorClass(page.color)}`}>
                    {page.layer}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{page.title}</h3>
                <p className="text-sm text-slate-300">{page.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Architecture Section */}
      <div className="bg-slate-800 py-16 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Two-Layer Architecture
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border-2 border-blue-500 bg-blue-900/30 rounded-lg p-6">
              <span className="inline-block bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium mb-2">Layer 1</span>
              <h3 className="text-xl font-bold text-blue-300 mb-2">Allocation Optimization</h3>
              <p className="text-blue-400 text-sm mb-4">Strategic decision layer</p>
              <div className="text-slate-200 mb-4">
                <strong>Answers:</strong> WHAT goes WHERE and WHEN
              </div>
              <ul className="list-disc pl-6 text-slate-300 space-y-2 mb-4">
                <li>Determines clinker flow quantities between plants</li>
                <li>Minimizes total network cost (production + transport + inventory)</li>
                <li>Respects capacity and safety stock constraints</li>
                <li>Output: Allocation matrix (IU × GU × Time)</li>
              </ul>
              <div className="text-sm text-slate-400">
                <strong>Method:</strong> MILP with Pyomo (Gurobi/CBC/GLPK)
              </div>
            </div>

            <div className="border-2 border-green-500 bg-green-900/30 rounded-lg p-6">
              <span className="inline-block bg-green-600 text-white px-2 py-1 rounded text-sm font-medium mb-2">Layer 2</span>
              <h3 className="text-xl font-bold text-green-300 mb-2">Transportation Optimization</h3>
              <p className="text-green-400 text-sm mb-4">Operational execution layer</p>
              <div className="text-slate-200 mb-4">
                <strong>Answers:</strong> HOW to move clinker physically
              </div>
              <ul className="list-disc pl-6 text-slate-300 space-y-2 mb-4">
                <li>Mode selection (Truck, Rail, Ship)</li>
                <li>Trip scheduling with SBQ constraints</li>
                <li>Multi-destination consolidation analysis</li>
                <li>Output: Route plans and trip counts</li>
              </ul>
              <div className="text-sm text-slate-400">
                <strong>Method:</strong> Heuristic optimization with consolidation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-8 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400">
            Clinker DSS • Hack Innovate AIDTM – Challenge 2
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Built with FastAPI, Pyomo, Next.js, and React
          </p>
        </div>
      </footer>
    </div>
  );
}
