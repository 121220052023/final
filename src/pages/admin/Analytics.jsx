import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, TrendingDown, CreditCard, Activity, BarChart3, Crown, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import AdminSidebar from '../../components/AdminSidebar';

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/stripe/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to load analytics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-body flex items-center justify-center">
        <AdminSidebar />
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-body">
        <AdminSidebar />
        <div className="admin-main">
          <div className="max-w-md mx-auto text-center pt-24">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 bg-destructive/15 flex items-center justify-center">
              <Activity className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-lg font-bold text-foreground mb-1">Failed to load analytics</p>
            <p className="text-sm text-muted-foreground mb-6">
              {error.includes('const') || error.includes('SUPABASE')
                ? 'The analytics endpoint is not deployed yet. Redeploy your app to Vercel, then try again.'
                : error}
            </p>
            <button onClick={loadAnalytics} className="admin-btn-primary px-6 py-2.5">Retry</button>
            <p className="text-xs mt-4 text-muted-foreground/50">
              Make sure STRIPE_SECRET_KEY and SUPABASE_SERVICE_KEY are set in Vercel env vars.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: 'Active Subscriptions', value: data.activeSubscriptions, icon: Users },
    { label: 'MRR (Monthly)', value: `$${data.mrr.toFixed(2)}`, icon: DollarSign },
    { label: 'Churn Rate (30d)', value: `${data.churnRate}%`, icon: TrendingDown },
    { label: 'Trialing', value: data.trialing, icon: CreditCard },
    { label: 'Canceled', value: data.canceled, icon: Activity },
    { label: 'Total All Time', value: data.totalSubscriptions, icon: BarChart3 },
  ];

  return (
    <div className="admin-body">
      <AdminSidebar />
      <div className="admin-main">
        <div className="max-w-[1400px]">
          <div className="flex items-start justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="admin-glow-line" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Analytics</span>
              </div>
              <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">
                Subscription Analytics
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Track MRR, churn, active subscribers, and growth trends
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {stats.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="admin-card p-4"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mb-2.5">
                  <item.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="mono-num text-2xl text-foreground">{item.value}</div>
                <div className="text-xs mt-0.5 text-muted-foreground">{item.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="admin-card p-6">
              <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Monthly Signups
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthlySignups}>
                  <XAxis dataKey="month" stroke="var(--app-muted-foreground)" strokeOpacity={0.4} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--app-muted-foreground)" strokeOpacity={0.4} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--app-muted)', fillOpacity: 0.3 }}
                    contentStyle={{
                      background: 'var(--app-card)',
                      border: '1px solid var(--app-border)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    }}
                    labelStyle={{ color: 'var(--app-muted-foreground)', fontSize: 12, fontWeight: 600 }}
                    itemStyle={{ color: 'var(--app-foreground)', fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}
                  />
                  <Bar dataKey="count" fill="var(--app-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="admin-card p-6">
              <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Plan Breakdown
              </h3>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Star className="w-4 h-4 text-purple-500" />
                      Pro
                    </span>
                    <span className="mono-num text-sm text-foreground">{data.planBreakdown.pro}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                      style={{ width: `${data.activeSubscriptions > 0 ? (data.planBreakdown.pro / data.activeSubscriptions) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" />
                      Ultimate
                    </span>
                    <span className="mono-num text-sm text-foreground">{data.planBreakdown.ultimate}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-primary transition-all"
                      style={{ width: `${data.activeSubscriptions > 0 ? (data.planBreakdown.ultimate / data.activeSubscriptions) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                {data.activeSubscriptions > 0 && (
                  <div className="pt-3 text-center border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Pro {(data.planBreakdown.pro / data.activeSubscriptions * 100).toFixed(0)}% · Ultimate {(data.planBreakdown.ultimate / data.activeSubscriptions * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;