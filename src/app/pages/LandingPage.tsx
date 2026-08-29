import { useNavigate } from 'react-router';
import { FileText, Users, Baby, Bell, BarChart, Shield, ArrowRight, Activity, Database, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      color: 'bg-blue-100 text-blue-600',
      title: 'Document Clearance Processing',
      description: 'Automated request and issuance of Barangay Clearances, Residency Certificates, and Business Permits.'
    },
    {
      icon: Users,
      color: 'bg-indigo-100 text-indigo-600',
      title: 'Demographics & Household Registry',
      description: 'Comprehensive resident database management for accurate record retrieval and census reporting.'
    },
    {
      icon: Baby,
      color: 'bg-teal-100 text-teal-600',
      title: 'Child Healthcare & Immunization',
      description: 'Systematic tracking of infant vaccinations (BCG, HepB, DPT, Polio, MMR) with overdue automated alerts.'
    },
    {
      icon: Bell,
      color: 'bg-purple-100 text-purple-600',
      title: 'SMS Alerts & Notifications',
      description: 'Timely SMS broadcast reminders sent to mothers and residents for scheduled health checkups.'
    },
    {
      icon: BarChart,
      color: 'bg-amber-100 text-amber-600',
      title: 'Real-time MySQL Analytics',
      description: 'Instant data summaries and health coverage rate reports generated directly from database tables.'
    },
    {
      icon: Shield,
      color: 'bg-emerald-100 text-emerald-600',
      title: 'Secure Role-Based Portals',
      description: 'Segregated access for Administrators and Health Nurses with complete activity audit logs.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Top Navbar */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-md border border-slate-200 flex items-center justify-center">
              <img src="/assets/pianing-logo.png" alt="Barangay Pianing" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 dark:text-white block leading-tight">Barangay Pianing</span>
              <span className="text-xs text-slate-500 font-medium">Smart Barangay Portal — Butuan City</span>
            </div>
          </div>

          <div className="flex items-center gap-3">

            <Button
              onClick={() => navigate('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-sm"
            >
              Portal Login
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 mb-4 text-xs font-semibold rounded-full">
          ✨ Barangay Pianing, Butuan City, Agusan del Norte
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4 max-w-4xl mx-auto leading-tight">
          Modern Digital Transformation for <span className="text-blue-600">Barangay Pianing</span>, Butuan City
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-8 leading-relaxed">
          An integrated web system streamlining document clearance processing, resident household management, maternal care schedules, infant immunization tracking, and SMS alert dispatch for Barangay Pianing.
        </p>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-8 h-12 shadow-lg shadow-blue-500/20"
          >
            Portal Login
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Core System Features</h2>
          <p className="text-xs text-slate-500">Built to empower barangay staff, nurses, and local community residents.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-slate-200 bg-white hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-3 shadow-xs`}>
                  <feature.icon size={24} />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs text-slate-500 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Database Highlights Banner */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 my-8">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <Badge className="bg-indigo-500 text-white font-mono text-[11px]">MySQL Relational Engine</Badge>
            <h3 className="text-2xl font-bold">Relational Database Schemas Included</h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Equipped with ready-to-run DDL scripts (<code className="text-indigo-300 font-mono">database/schema.sql</code>) and realistic seed datasets (<code className="text-indigo-300 font-mono">database/seed.sql</code>) for MySQL 8.0+.
            </p>
          </div>
          <Button
            onClick={() => navigate('/login')}
            className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs h-11 px-6 shrink-0 shadow-md"
          >
            Launch System Demo
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div>
            <p className="font-semibold text-slate-300">Smart Barangay Administrative Management & Public Health System</p>
            <p className="text-[11px] text-slate-500 mt-0.5">&copy; 2026 Smart Barangay System. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-2">
            <Database size={14} className="text-indigo-400" />
            <span className="font-mono text-[11px]">MySQL Integrated</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
