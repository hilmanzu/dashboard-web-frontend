'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    DashboardData,
    KeluhanSummary,
    LngSupplySummary,
    EnergyDeliverySummary,
    BogSummary,
    ChartDataPoint,
    LngChartResponse,
    EnergyChartResponse,
    SendOutChartResponse,
    SurveyYearResponse,
} from '@/types/dashboard';
import {
    User,
    Ship,
    BarChart3,
    Calendar,
    CalendarDays,
    Inbox,
    MailCheck,
    ClipboardList,
    MonitorSmartphone,
    Target,
    Zap,
} from 'lucide-react';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ─── Utility ───────────────────────────────────────────────────────
function getAuthConfig() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return { headers: { Authorization: `Bearer ${token}` } };
}

function hasAccess(access: string[], key: string, isAdmin: boolean) {
    return isAdmin || access.includes(key);
}

function fmt(val: number | string | undefined | null): string {
    if (val === undefined || val === null || val === '-') return '-';
    return new Intl.NumberFormat('id-ID').format(Number(val));
}

// ─── Sub-components ────────────────────────────────────────────────

function StatCard({
    title,
    items,
    extra,
}: {
    title: string;
    items: { label: string; value: string | number; icon: React.ReactNode; color: string; bgColor: string }[];
    extra?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <h4 className="text-lg font-semibold text-gray-800 mb-5">{title}</h4>
            <div className="flex flex-col gap-5 flex-1">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <div
                            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                            style={{ color: item.color, backgroundColor: item.bgColor }}
                        >
                            {item.icon}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm text-gray-500 truncate">{item.label}</p>
                            <p className="text-lg font-semibold text-gray-800">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>
            {extra}
        </div>
    );
}

function ProfileCard({
    data,
}: {
    data: DashboardData | null;
}) {
    if (!data) return null;
    const user = data.user;
    const profileSrc = user.profile_picture
        ? `/storage/profile/${user.profile_picture}`
        : null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-3 relative">
                {profileSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileSrc} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                    <User className="w-8 h-8 text-gray-400" />
                )}
            </div>
            <p className="text-lg font-semibold text-gray-800">{user.name}</p>
            {!data.isAdmin && (
                <>
                    <p className="text-sm font-medium text-gray-500">{data.type}</p>
                    <p className="text-xs text-gray-400">
                        {data.division} - {data.duty}
                    </p>
                </>
            )}
        </div>
    );
}

// ─── Summary Stat Box ──────────────────────────────────────────────
function SummaryBox({
    label,
    value,
    color,
    bgColor,
}: {
    label: string;
    value: string | number;
    color: string;
    bgColor: string;
}) {
    return (
        <div className="rounded-lg p-4 flex-1 min-w-0" style={{ color, backgroundColor: bgColor, minHeight: 80 }}>
            <p className="text-xs font-light mb-1 truncate">{label}</p>
            <p className="text-base font-semibold truncate">{value}</p>
        </div>
    );
}

// ─── Tab selector ──────────────────────────────────────────────────
function TabBar({
    tabs,
    activeTab,
    setActiveTab,
}: {
    tabs: { key: string; label: string }[];
    activeTab: string;
    setActiveTab: (k: string) => void;
}) {
    return (
        <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab.key
                        ? 'border-[#00CFE8] text-[#00CFE8]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

// ─── Year Select ───────────────────────────────────────────────────
function YearSelect({
    value,
    onChange,
    range,
    label,
    disableYear,
    allowEmpty,
}: {
    value: number | string;
    onChange: (v: number | string) => void;
    range: number[];
    label?: string;
    disableYear?: number;
    allowEmpty?: boolean;
}) {
    return (
        <div className="flex items-center gap-2">
            {label && <label className="text-sm text-gray-500 whitespace-nowrap">{label}</label>}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00CFE8]"
            >
                {allowEmpty && <option value="">-</option>}
                {range.map((y) => (
                    <option key={y} value={y} disabled={disableYear === y}>
                        {y}
                    </option>
                ))}
            </select>
        </div>
    );
}

// ─── Company Select ────────────────────────────────────────────────
function CompanySelect({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (v: string) => void;
    options?: { value: string; label: string }[];
}) {
    const opts = options || [
        { value: 'total', label: 'Total' },
        { value: 'pgn', label: 'PGN' },
        { value: 'pln', label: 'PLN' },
    ];
    return (
        <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap">Company</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00CFE8]"
            >
                {opts.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

// ─── Report table component ────────────────────────────────────────

function ReportTable({
    columns,
    dataUrl,
    activeTab,
    tabKey,
}: {
    columns: { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }[];
    dataUrl: string;
    activeTab: string;
    tabKey: string;
}) {
    const [rows, setRows] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        if (activeTab !== tabKey) return;
        setLoading(true);
        const config = getAuthConfig();
        axios
            .get(dataUrl, {
                ...config,
                params: { start: page * pageSize, length: pageSize, 'columns[0][data]': 'id' },
            })
            .then((res) => {
                const d = res.data;
                setRows(d.data ?? []);
                setTotalPages(Math.max(1, Math.ceil((d.recordsTotal ?? 0) / pageSize)));
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [activeTab, tabKey, dataUrl, page]);

    if (activeTab !== tabKey) return null;

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">No</th>
                            {columns.map((c) => (
                                <th key={c.key} className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs whitespace-nowrap">
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400">
                                    Loading...
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-600">{page * pageSize + idx + 1}</td>
                                    {columns.map((c) => (
                                        <td key={c.key} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                            {c.render ? c.render(row) : (row[c.key] as React.ReactNode) ?? '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <button
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-500">
                        Page {page + 1} of {totalPages}
                    </span>
                    <button
                        disabled={page + 1 >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main dashboard page ───────────────────────────────────────────

export default function DashboardPage() {
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [keluhan, setKeluhan] = useState<KeluhanSummary | null>(null);
    const [lngSupply, setLngSupply] = useState<LngSupplySummary | null>(null);
    const [energyDelivery, setEnergyDelivery] = useState<EnergyDeliverySummary | null>(null);
    const [bogSummary, setBogSummary] = useState<BogSummary | null>(null);

    // Survey year
    const [surveyYear, setSurveyYear] = useState(new Date().getFullYear());
    const [surveySummary, setSurveySummary] = useState<{ semester_1: number; semester_2: number; total: number } | null>(null);
    const [targetScore, setTargetScore] = useState<number>(0);

    // LNG Chart
    const [lngChartResp, setLngChartResp] = useState<LngChartResponse | null>(null);
    const [lngYear, setLngYear] = useState(new Date().getFullYear());
    const [lngComparisonYear, setLngComparisonYear] = useState<number | string>('');
    const [lngCompany, setLngCompany] = useState('total');
    const [lngChartTab, setLngChartTab] = useState('total');
    const [lngComparisonResp, setLngComparisonResp] = useState<LngChartResponse | null>(null);

    // LNG Company chart (PGN & PLN tab)
    const [lngCompanyYear, setLngCompanyYear] = useState(new Date().getFullYear());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [lngCompanyResp, setLngCompanyResp] = useState<any>(null);

    // Energy Chart
    const [energyChartResp, setEnergyChartResp] = useState<EnergyChartResponse | null>(null);
    const [energyYear, setEnergyYear] = useState(new Date().getFullYear());
    const [energyComparisonYear, setEnergyComparisonYear] = useState<number | string>('');
    const [energyCompany, setEnergyCompany] = useState('total');
    const [energyChartTab, setEnergyChartTab] = useState('total');
    const [energyComparisonResp, setEnergyComparisonResp] = useState<EnergyChartResponse | null>(null);

    // Energy Company chart (PGN & PLN tab)
    const [energyCompanyYear, setEnergyCompanyYear] = useState(new Date().getFullYear());
    const [energyCompanyResp, setEnergyCompanyResp] = useState<EnergyChartResponse | null>(null);

    // STS
    const [stsChartData, setStsChartData] = useState<ChartDataPoint[]>([]);
    const [stsYear, setStsYear] = useState(new Date().getFullYear());

    // BOG
    const [bogChartData, setBogChartData] = useState<ChartDataPoint[]>([]);
    const [bogYear, setBogYear] = useState(new Date().getFullYear());
    const [bogType, setBogType] = useState('fsru');
    const [bogCompany, setBogCompany] = useState('total');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bogMultiData, setBogMultiData] = useState<any>(null);

    // Send-out
    const [sendOutResp, setSendOutResp] = useState<SendOutChartResponse | null>(null);
    const [sendOutYear, setSendOutYear] = useState(new Date().getFullYear());
    const [sendOutComparisonYear, setSendOutComparisonYear] = useState<number | string>('');

    const [loading, setLoading] = useState(true);

    // report tabs
    const [reportTab, setReportTab] = useState('');
    const [statsTab, setStatsTab] = useState('');

    const access = dashboardData?.dashboardAccess ?? [];
    const isAdmin = dashboardData?.isAdmin ?? false;

    const yearRange = useCallback(
        (firstYear: number) => {
            const arr: number[] = [];
            for (let y = new Date().getFullYear(); y >= firstYear; y--) arr.push(y);
            return arr;
        },
        []
    );

    const yearRange10 = useCallback(() => {
        const arr: number[] = [];
        const now = new Date().getFullYear();
        for (let y = now; y >= now - 10; y--) arr.push(y);
        return arr;
    }, []);

    // ─── Fetch index data ──────────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const config = getAuthConfig();

        const fetchAll = async () => {
            try {
                const { data } = await axios.get('/api/dashboard', config);
                setDashboardData(data);
                setSurveySummary(data.surveySummary);
                setTargetScore(data.targetScore ?? 0);

                const acc: string[] = data.dashboardAccess ?? [];
                const admin: boolean = data.isAdmin ?? false;
                const promises: Promise<void>[] = [];

                if (hasAccess(acc, 'card_keluhan_pelanggan', admin)) {
                    promises.push(
                        axios.get('/api/dashboard/keluhan', config).then((r) => setKeluhan(r.data))
                    );
                }
                if (hasAccess(acc, 'card_penerimaan_lng', admin)) {
                    promises.push(
                        axios.get('/api/dashboard/lng-supply', config).then((r) => setLngSupply(r.data))
                    );
                }
                if (hasAccess(acc, 'card_penyaluran_gas', admin)) {
                    promises.push(
                        axios.get('/api/dashboard/energy-delivery', config).then((r) => setEnergyDelivery(r.data))
                    );
                }
                if (hasAccess(acc, 'card_bog', admin)) {
                    promises.push(
                        axios.get('/api/dashboard/bog', config).then((r) => setBogSummary(r.data))
                    );
                }

                await Promise.allSettled(promises);

                // set default report / stats tabs
                const tabMap = [
                    ['laporan_proyeksi', 'proyeksi'],
                    ['laporan_laytime', 'laytime'],
                    ['laporan_nominasi_lng', 'nominasi'],
                    ['laporan_keluhan_pelanggan', 'keluhan'],
                    ['laporan_administrasi_kontrak', 'administrasi'],
                ];
                for (const [key, val] of tabMap) {
                    if (hasAccess(acc, key, admin)) {
                        setReportTab(val);
                        break;
                    }
                }
                const sTabMap = [
                    ['chart_jumlah_sts', 'sts'],
                    ['chart_bog', 'bog'],
                ];
                for (const [key, val] of sTabMap) {
                    if (hasAccess(acc, key, admin)) {
                        setStatsTab(val);
                        break;
                    }
                }
            } catch (err) {
                console.error(err);
                localStorage.removeItem('token');
                router.push('/');
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [router]);

    // ─── Survey year updater ───────────────────────────────────────
    useEffect(() => {
        if (!dashboardData) return;
        const config = getAuthConfig();
        axios
            .post('/api/dashboard/update-year', { year: surveyYear }, config)
            .then((r) => {
                const resp = r.data as SurveyYearResponse;
                if (resp.success) {
                    setSurveySummary(resp.data.surveySummary);
                    setTargetScore(resp.data.targetScore ?? 0);
                }
            })
            .catch(() => { });
    }, [surveyYear, dashboardData]);

    // ─── LNG Chart fetcher ─────────────────────────────────────────
    useEffect(() => {
        if (!dashboardData) return;
        if (!hasAccess(access, 'chart_penerimaan_lng', isAdmin)) return;
        const config = getAuthConfig();
        axios
            .get('/api/dashboard/lng-supply-chart', { ...config, params: { year: lngYear, company: lngCompany } })
            .then((r) => setLngChartResp(r.data))
            .catch(() => { });
    }, [lngYear, lngCompany, dashboardData, access, isAdmin]);

    // LNG comparison year
    useEffect(() => {
        if (!dashboardData || !lngComparisonYear) { setLngComparisonResp(null); return; }
        if (!hasAccess(access, 'chart_penerimaan_lng', isAdmin)) return;
        const config = getAuthConfig();
        axios
            .get('/api/dashboard/lng-supply-chart', { ...config, params: { year: lngComparisonYear, company: lngCompany } })
            .then((r) => setLngComparisonResp(r.data))
            .catch(() => { });
    }, [lngComparisonYear, lngCompany, dashboardData, access, isAdmin]);

    // LNG Company tab
    useEffect(() => {
        if (!dashboardData || lngChartTab !== 'company') return;
        if (!hasAccess(access, 'chart_penerimaan_lng', isAdmin)) return;
        const config = getAuthConfig();
        axios
            .get('/api/dashboard/lng-supply-chart', { ...config, params: { year: lngCompanyYear, company: 'all' } })
            .then((r) => setLngCompanyResp(r.data))
            .catch(() => { });
    }, [lngCompanyYear, lngChartTab, dashboardData, access, isAdmin]);

    // ─── Energy Chart fetcher ──────────────────────────────────────
    useEffect(() => {
        if (!dashboardData) return;
        if (!hasAccess(access, 'chart_penyaluran_gas', isAdmin)) return;
        const config = getAuthConfig();
        axios
            .get('/api/dashboard/energy-chart', { ...config, params: { year: energyYear, company: energyCompany } })
            .then((r) => setEnergyChartResp(r.data))
            .catch(() => { });
    }, [energyYear, energyCompany, dashboardData, access, isAdmin]);

    // Energy comparison year
    useEffect(() => {
        if (!dashboardData || !energyComparisonYear) { setEnergyComparisonResp(null); return; }
        if (!hasAccess(access, 'chart_penyaluran_gas', isAdmin)) return;
        const config = getAuthConfig();
        axios
            .get('/api/dashboard/energy-chart', { ...config, params: { year: energyComparisonYear, company: energyCompany } })
            .then((r) => setEnergyComparisonResp(r.data))
            .catch(() => { });
    }, [energyComparisonYear, energyCompany, dashboardData, access, isAdmin]);

    // Energy Company tab
    useEffect(() => {
        if (!dashboardData || energyChartTab !== 'company') return;
        if (!hasAccess(access, 'chart_penyaluran_gas', isAdmin)) return;
        const config = getAuthConfig();
        axios
            .get('/api/dashboard/energy-chart', { ...config, params: { year: energyCompanyYear, company: 'all' } })
            .then((r) => setEnergyCompanyResp(r.data))
            .catch(() => { });
    }, [energyCompanyYear, energyChartTab, dashboardData, access, isAdmin]);

    // ─── STS Chart fetcher ─────────────────────────────────────────
    useEffect(() => {
        if (!dashboardData) return;
        if (!hasAccess(access, 'chart_jumlah_sts', isAdmin)) return;
        const config = getAuthConfig();
        axios
            .get('/api/dashboard/sts-chart', { ...config, params: { year: stsYear } })
            .then((r) => setStsChartData(r.data))
            .catch(() => { });
    }, [stsYear, dashboardData, access, isAdmin]);

    // ─── BOG Chart fetcher ─────────────────────────────────────────
    useEffect(() => {
        if (!dashboardData) return;
        if (!hasAccess(access, 'chart_bog', isAdmin)) return;
        const config = getAuthConfig();
        axios
            .get('/api/dashboard/bog-chart', { ...config, params: { year: bogYear, type: bogType, company: bogCompany } })
            .then((r) => {
                const d = r.data;
                if (bogType === 'tua' && bogCompany === 'pgnpln') {
                    setBogMultiData(d);
                    setBogChartData([]);
                } else {
                    setBogChartData(Array.isArray(d) ? d : []);
                    setBogMultiData(null);
                }
            })
            .catch(() => { });
    }, [bogYear, bogType, bogCompany, dashboardData, access, isAdmin]);

    // ─── Send-out Chart fetcher ────────────────────────────────────
    useEffect(() => {
        if (!dashboardData) return;
        if (!hasAccess(access, 'chart_penyaluran_gas', isAdmin)) return;
        const config = getAuthConfig();
        const params: Record<string, unknown> = { year: sendOutYear };
        if (sendOutComparisonYear) params.yearComparison = sendOutComparisonYear;
        axios
            .get('/api/dashboard/send-out-chart', { ...config, params })
            .then((r) => setSendOutResp(r.data))
            .catch(() => { });
    }, [sendOutYear, sendOutComparisonYear, dashboardData, access, isAdmin]);

    // ─── Tooltip renderers ─────────────────────────────────────────
    const lngTooltip = (d: ChartDataPoint) =>
        `<div style="padding:12px;font-size:13px"><table>
      <tr><td><b>Total</b></td><td style="padding-left:8px;text-align:right">${fmt(d.y)}</td></tr>
      <tr><td><b>Min</b></td><td style="padding-left:8px;text-align:right">${fmt(d.min)}</td></tr>
      <tr><td><b>Max</b></td><td style="padding-left:8px;text-align:right">${fmt(d.max)}</td></tr>
      <tr><td><b>Avg</b></td><td style="padding-left:8px;text-align:right">${fmt(d.mean)}</td></tr>
    </table></div>`;

    const energyTooltip = (d: ChartDataPoint) =>
        `<div style="padding:12px;font-size:13px"><table>
      <tr><td><b>Total</b></td><td style="padding-left:8px;text-align:right">${d.values ?? d.value}</td></tr>
      <tr><td><b>Min</b></td><td style="padding-left:8px;text-align:right">${d.min}</td></tr>
      <tr><td><b>Max</b></td><td style="padding-left:8px;text-align:right">${d.max}</td></tr>
      <tr><td><b>Avg</b></td><td style="padding-left:8px;text-align:right">${d.mean}</td></tr>
    </table></div>`;

    const bogTooltip = (d: ChartDataPoint) =>
        `<div style="padding:12px;font-size:13px"><table>
      <tr><td><b>Min</b></td><td style="padding-left:8px;text-align:right">${d.min}</td></tr>
      <tr><td><b>Max</b></td><td style="padding-left:8px;text-align:right">${d.max}</td></tr>
      <tr><td><b>Avg</b></td><td style="padding-left:8px;text-align:right">${d.mean}</td></tr>
    </table></div>`;

    // ─── Render ────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CFE8]" />
            </div>
        );
    }

    const currentYear = new Date().getFullYear();
    const currentMonthName = new Date().toLocaleString('id-ID', { month: 'long' });

    // Active survey data
    const activeSurvey = surveySummary ?? dashboardData?.surveySummary;
    const activeTarget = targetScore;
    const isAchieved = activeSurvey && activeTarget ? activeSurvey.total >= activeTarget : false;

    // Tab definitions
    const reportTabs = [
        { key: 'proyeksi', label: 'Proyeksi Pasokan', access: 'laporan_proyeksi' },
        { key: 'laytime', label: 'Laytime & Demurrage', access: 'laporan_laytime' },
        { key: 'nominasi', label: 'Nominasi LNG', access: 'laporan_nominasi_lng' },
        { key: 'keluhan', label: 'Keluhan Pelanggan', access: 'laporan_keluhan_pelanggan' },
        { key: 'administrasi', label: 'Administrasi Kontrak', access: 'laporan_administrasi_kontrak' },
    ].filter((t) => hasAccess(access, t.access, isAdmin));

    const statsTabs = [
        { key: 'sts', label: 'Jumlah STS', access: 'chart_jumlah_sts' },
        { key: 'bog', label: 'Boil of Gas (BoG)', access: 'chart_bog' },
    ].filter((t) => hasAccess(access, t.access, isAdmin));

    // ─── Chart builders ────────────────────────────────────────────
    function buildBarChart(
        chartData: ChartDataPoint[],
        fillColor: string,
        tooltipFn?: (d: ChartDataPoint) => string,
        comparisonData?: ChartDataPoint[],
    ) {
        const categories = chartData.map((d) => String(d.x));
        const series: { name: string; data: number[] }[] = [
            { name: 'Data', data: chartData.map((d) => (typeof d.y === 'string' ? parseFloat(d.y) : d.y)) },
        ];
        const colors = [fillColor];
        if (comparisonData && comparisonData.length > 0) {
            series.push({
                name: 'Perbandingan',
                data: comparisonData.map((d) => (typeof d.y === 'string' ? parseFloat(d.y) : d.y)),
            });
            colors.push('#A0A0A0');
        }

        const options: ApexCharts.ApexOptions = {
            chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
            plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
            dataLabels: { enabled: false },
            colors,
            xaxis: { categories },
            yaxis: {
                labels: { formatter: (val: number) => new Intl.NumberFormat('id-ID').format(Math.round(val)) },
            },
            grid: { borderColor: '#f1f1f1', strokeDashArray: 4 },
            tooltip: tooltipFn
                ? {
                    custom: ({ dataPointIndex, seriesIndex }: { dataPointIndex: number; seriesIndex: number }) => {
                        const src = seriesIndex === 0 ? chartData : (comparisonData ?? chartData);
                        const d = src[dataPointIndex];
                        return d ? tooltipFn(d) : '';
                    },
                }
                : { y: { formatter: (val: number) => new Intl.NumberFormat('id-ID').format(val) } },
        };

        return { options, series };
    }

    // LNG chart data
    const lngChartData = lngChartResp?.data ?? [];
    const lngComparisonData = lngComparisonResp?.data;

    // Energy chart data
    const energyChartData = energyChartResp?.data ?? [];
    const energyComparisonData = energyComparisonResp?.data;

    return (
        <div className="flex min-h-screen bg-[#F8F8F8] font-sans">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header />

                <main className="flex-1 overflow-y-auto p-6">
                    <h1 className="text-xl font-medium text-gray-600 mb-6">Dashboard</h1>

                    {/* ── Row 1: Profile + Survey + Keluhan ──────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <ProfileCard data={dashboardData} />

                        {hasAccess(access, 'card_survey_kepuasan_pelanggan', isAdmin) && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h4 className="text-lg font-semibold text-gray-800">Kepuasan Pelanggan</h4>
                                    <YearSelect value={surveyYear} onChange={(v) => setSurveyYear(Number(v))} range={yearRange10()} label="Tahun" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[#242745] bg-[rgba(115,103,240,0.08)] font-bold">1</div>
                                            <div>
                                                <p className="text-sm text-gray-500">Semester 1</p>
                                                <p className="text-lg font-semibold">{activeSurvey?.semester_1 ? activeSurvey.semester_1.toFixed(2) : '-'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[#FF9F43] bg-[rgba(255,159,67,0.08)] font-bold">2</div>
                                            <div>
                                                <p className="text-sm text-gray-500">Semester 2</p>
                                                <p className="text-lg font-semibold">{activeSurvey?.semester_2?.toFixed(2) ?? '0.00'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3 justify-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-[#28C76F] bg-[rgba(40,199,111,0.08)]">
                                                <ClipboardList className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-400">Total</p>
                                                <p className="text-lg font-bold text-gray-800">{activeSurvey?.total?.toFixed(2) ?? '0.00'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-[#242745] bg-[rgba(115,103,240,0.08)]">
                                                <Target className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-400">Target Capaian</p>
                                                <p className="text-lg font-bold text-gray-800">{activeTarget ? activeTarget.toFixed(2) : '-'}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-1">
                                            <span className={`text-sm font-medium px-3 py-1 rounded-full ${isAchieved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {isAchieved ? 'Tercapai' : 'Tidak Tercapai'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {hasAccess(access, 'card_keluhan_pelanggan', isAdmin) && (
                            <StatCard
                                title="Keluhan Pelanggan"
                                items={[
                                    { label: 'Aktif', value: keluhan?.open ?? '-', icon: <Inbox className="w-5 h-5" />, color: '#EA5455', bgColor: 'rgba(234,84,85,0.08)' },
                                    { label: 'Selesai', value: keluhan?.closed ?? '-', icon: <MailCheck className="w-5 h-5" />, color: '#28C76F', bgColor: 'rgba(40,199,111,0.08)' },
                                ]}
                            />
                        )}
                    </div>

                    {/* ── Row 2: LNG + Energy cards ───────────────── */}
                    {(hasAccess(access, 'card_penerimaan_lng', isAdmin) ||
                        hasAccess(access, 'card_penyaluran_gas', isAdmin) ||
                        hasAccess(access, 'card_bog', isAdmin)) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                {hasAccess(access, 'card_penerimaan_lng', isAdmin) && (
                                    <StatCard
                                        title="Penerimaan LNG"
                                        items={[
                                            { label: `Tahun ${currentYear} (m³)`, value: lngSupply?.current_year ?? '-', icon: <BarChart3 className="w-5 h-5" />, color: '#242745', bgColor: 'rgba(115,103,240,0.08)' },
                                            { label: 'Total (m³)', value: lngSupply?.all_data ?? '-', icon: <MonitorSmartphone className="w-5 h-5" />, color: '#FF9F43', bgColor: 'rgba(255,159,67,0.08)' },
                                        ]}
                                    />
                                )}

                                {hasAccess(access, 'card_penyaluran_gas', isAdmin) && (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                        <h4 className="text-lg font-semibold text-gray-800 mb-5">Penyaluran Gas</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-[#EA5455] bg-[rgba(234,84,85,0.08)]">
                                                        <Ship className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-500">Tahun {currentYear} (MMBTU)</p>
                                                        <p className="text-lg font-semibold">{energyDelivery?.current_year ?? '-'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-[#28C76F] bg-[rgba(40,199,111,0.08)]">
                                                        <MonitorSmartphone className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-500">Total (MMBTU)</p>
                                                        <p className="text-lg font-semibold">{energyDelivery?.all_data ?? '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-[#28C76F] bg-[rgba(40,199,111,0.08)]">
                                                        <Zap className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-400">Latest Energy Delivery (MMBTUD)</p>
                                                        <p className="text-lg font-bold text-gray-800">{energyDelivery?.data_yesterday ?? '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {hasAccess(access, 'card_bog', isAdmin) && (
                                    <StatCard
                                        title="Boil of Gas (BoG)"
                                        items={[
                                            {
                                                label: `BOG Terakhir ${bogSummary?.bog_date ? new Date(bogSummary.bog_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} (%)`,
                                                value: bogSummary?.bog_daily ?? '-',
                                                icon: <Calendar className="w-5 h-5" />, color: '#242745', bgColor: 'rgba(115,103,240,0.08)',
                                            },
                                            { label: `Bulan ${currentMonthName} (%)`, value: bogSummary?.bog_monthly ?? '-', icon: <CalendarDays className="w-5 h-5" />, color: '#FF9F43', bgColor: 'rgba(255,159,67,0.08)' },
                                        ]}
                                    />
                                )}
                            </div>
                        )}

                    {/* ── Row 3: LNG Chart (with tabs, company, comparison) ── */}
                    {hasAccess(access, 'chart_penerimaan_lng', isAdmin) && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
                            <TabBar
                                tabs={[{ key: 'total', label: 'Total' }, { key: 'company', label: 'PGN & PLN' }]}
                                activeTab={lngChartTab}
                                setActiveTab={setLngChartTab}
                            />
                            {lngChartTab === 'total' && (
                                <div className="p-6">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                        <h4 className="text-lg font-semibold text-gray-800">Penerimaan LNG (m³)</h4>
                                        <div className="flex flex-wrap gap-3">
                                            <YearSelect value={lngYear} onChange={(v) => setLngYear(Number(v))} range={yearRange(dashboardData?.lng_first_year ?? currentYear)} label="Tahun" />
                                            <YearSelect value={lngComparisonYear} onChange={setLngComparisonYear} range={yearRange(dashboardData?.lng_first_year ?? currentYear)} label="Perbandingan" disableYear={lngYear} allowEmpty />
                                            <CompanySelect value={lngCompany} onChange={setLngCompany} />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mb-4">
                                        <SummaryBox label={`Total ${lngYear}`} value={fmt(lngChartResp?.total_lng_for_year)} color="#242745" bgColor="rgba(115,103,240,0.08)" />
                                        <SummaryBox label="Total Jumlah STS" value={lngChartResp?.total_sts ?? '-'} color="#219bff" bgColor="rgba(67,186,255,0.116)" />
                                        <SummaryBox label="Total Standar Kargo" value={lngChartResp?.std_cargo ?? '-'} color="#7554ea" bgColor="rgba(154,84,234,0.11)" />
                                    </div>
                                    {lngComparisonResp && (
                                        <>
                                            <div className="flex gap-3 mb-2">
                                                <SummaryBox label={`Perbandingan ${lngComparisonYear}`} value={fmt(lngComparisonResp.total_lng_for_year)} color="#242745" bgColor="rgba(115,103,240,0.08)" />
                                                <SummaryBox label="STS Perbandingan" value={lngComparisonResp.total_sts ?? '-'} color="#219bff" bgColor="rgba(67,186,255,0.116)" />
                                                <SummaryBox label="Std Kargo Perbandingan" value={lngComparisonResp.std_cargo ?? '-'} color="#7554ea" bgColor="rgba(154,84,234,0.11)" />
                                            </div>
                                            <div className="flex gap-3 mb-4">
                                                <SummaryBox label="Perbedaan Total" value={fmt((lngChartResp?.total_lng_for_year ?? 0) - (lngComparisonResp.total_lng_for_year ?? 0))} color="#242745" bgColor="rgba(115,103,240,0.08)" />
                                                <SummaryBox label="Perbedaan STS" value={(lngChartResp?.total_sts ?? 0) - (lngComparisonResp.total_sts ?? 0)} color="#219bff" bgColor="rgba(67,186,255,0.116)" />
                                                <SummaryBox label="Perbedaan Std Kargo" value={((lngChartResp?.std_cargo ?? 0) - (lngComparisonResp.std_cargo ?? 0)).toFixed(2)} color="#7554ea" bgColor="rgba(154,84,234,0.11)" />
                                            </div>
                                        </>
                                    )}
                                    {(() => {
                                        const { options, series } = buildBarChart(lngChartData, '#7367F0', lngTooltip, lngComparisonData);
                                        return <Chart options={options} series={series} type="bar" height={360} />;
                                    })()}
                                    <p className="text-xs text-blue-500 mt-2">* 1 standar kargo setara 130.000 m³</p>
                                </div>
                            )}
                            {lngChartTab === 'company' && (
                                <div className="p-6">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                        <h4 className="text-lg font-semibold text-gray-800">Penerimaan LNG PGN & PLN (m³)</h4>
                                        <YearSelect value={lngCompanyYear} onChange={(v) => setLngCompanyYear(Number(v))} range={yearRange(dashboardData?.lng_first_year ?? currentYear)} label="Tahun" />
                                    </div>
                                    {lngCompanyResp && (
                                        <>
                                            <div className="flex gap-3 mb-4">
                                                <SummaryBox label={`Total PGN ${lngCompanyYear}`} value={fmt(lngCompanyResp.pgn?.total_lng_for_year)} color="#242745" bgColor="rgba(115,103,240,0.08)" />
                                                <SummaryBox label="STS PGN" value={lngCompanyResp.pgn?.total_sts ?? '-'} color="#219bff" bgColor="rgba(67,186,255,0.116)" />
                                                <SummaryBox label="Std Kargo PGN" value={lngCompanyResp.pgn?.std_cargo ?? '-'} color="#7554ea" bgColor="rgba(154,84,234,0.11)" />
                                            </div>
                                            <div className="flex gap-3 mb-4">
                                                <SummaryBox label={`Total PLN ${lngCompanyYear}`} value={fmt(lngCompanyResp.pln?.total_lng_for_year)} color="#242745" bgColor="rgba(115,103,240,0.08)" />
                                                <SummaryBox label="STS PLN" value={lngCompanyResp.pln?.total_sts ?? '-'} color="#219bff" bgColor="rgba(67,186,255,0.116)" />
                                                <SummaryBox label="Std Kargo PLN" value={lngCompanyResp.pln?.std_cargo ?? '-'} color="#7554ea" bgColor="rgba(154,84,234,0.11)" />
                                            </div>
                                            {(() => {
                                                const pgnData = lngCompanyResp.pgn?.data ?? [];
                                                const plnData = lngCompanyResp.pln?.data ?? [];
                                                const categories = pgnData.map((d: ChartDataPoint) => String(d.x));
                                                const series = [
                                                    { name: 'PGN', data: pgnData.map((d: ChartDataPoint) => (typeof d.y === 'string' ? parseFloat(d.y) : d.y)) },
                                                    { name: 'PLN', data: plnData.map((d: ChartDataPoint) => (typeof d.y === 'string' ? parseFloat(d.y) : d.y)) },
                                                ];
                                                const options: ApexCharts.ApexOptions = {
                                                    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
                                                    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
                                                    dataLabels: { enabled: false },
                                                    colors: ['#7367F0', '#FF9F43'],
                                                    xaxis: { categories },
                                                    yaxis: { labels: { formatter: (v: number) => fmt(v) } },
                                                    grid: { borderColor: '#f1f1f1', strokeDashArray: 4 },
                                                };
                                                return <Chart options={options} series={series} type="bar" height={360} />;
                                            })()}
                                        </>
                                    )}
                                    <p className="text-xs text-blue-500 mt-2">* 1 standar kargo setara 130.000 m³</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Row 4: Energy Chart (with tabs, company, comparison) ── */}
                    {hasAccess(access, 'chart_penyaluran_gas', isAdmin) && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
                            <TabBar
                                tabs={[{ key: 'total', label: 'Total' }, { key: 'company', label: 'PGN & PLN' }]}
                                activeTab={energyChartTab}
                                setActiveTab={setEnergyChartTab}
                            />
                            {energyChartTab === 'total' && (
                                <div className="p-6">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                        <h4 className="text-lg font-semibold text-gray-800">Penyaluran Gas (YTD)</h4>
                                        <div className="flex flex-wrap gap-3">
                                            <YearSelect value={energyYear} onChange={(v) => setEnergyYear(Number(v))} range={yearRange(dashboardData?.energy_first_year ?? currentYear)} label="Tahun" />
                                            <YearSelect value={energyComparisonYear} onChange={setEnergyComparisonYear} range={yearRange(dashboardData?.energy_first_year ?? currentYear)} label="Perbandingan" disableYear={energyYear} allowEmpty />
                                            <CompanySelect value={energyCompany} onChange={setEnergyCompany} />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mb-4">
                                        <SummaryBox label={`Total MMBTU ${energyYear}`} value={energyChartResp?.total_energy_for_year ?? '-'} color="#242745" bgColor="rgba(115,103,240,0.08)" />
                                        <SummaryBox label="Avg MMBTUD" value={energyChartResp?.average_energy_for_year ?? '-'} color="#219bff" bgColor="rgba(67,186,255,0.116)" />
                                        <SummaryBox label="Utilization (%)" value={energyChartResp?.average_energy_input ? `${energyChartResp.average_energy_input}%` : '-'} color="#7554ea" bgColor="rgba(154,84,234,0.11)" />
                                    </div>
                                    {energyComparisonResp && (
                                        <div className="flex gap-3 mb-4">
                                            <SummaryBox label={`Perbandingan ${energyComparisonYear}`} value={energyComparisonResp.total_energy_for_year ?? '-'} color="#242745" bgColor="rgba(115,103,240,0.08)" />
                                            <SummaryBox label="Avg Perbandingan" value={energyComparisonResp.average_energy_for_year ?? '-'} color="#219bff" bgColor="rgba(67,186,255,0.116)" />
                                            <SummaryBox label="Util. Perbandingan" value={energyComparisonResp.average_energy_input ? `${energyComparisonResp.average_energy_input}%` : '-'} color="#7554ea" bgColor="rgba(154,84,234,0.11)" />
                                        </div>
                                    )}
                                    {(() => {
                                        const { options, series } = buildBarChart(energyChartData, '#28C76F', energyTooltip, energyComparisonData);
                                        return <Chart options={options} series={series} type="bar" height={360} />;
                                    })()}
                                </div>
                            )}
                            {energyChartTab === 'company' && (
                                <div className="p-6">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                        <h4 className="text-lg font-semibold text-gray-800">Penyaluran Gas PGN & PLN (MMBTU)</h4>
                                        <YearSelect value={energyCompanyYear} onChange={(v) => setEnergyCompanyYear(Number(v))} range={yearRange(dashboardData?.energy_first_year ?? currentYear)} label="Tahun" />
                                    </div>
                                    {energyCompanyResp && (
                                        <>
                                            <div className="flex gap-3 mb-4">
                                                <SummaryBox label="Total PGN" value={energyCompanyResp.total_energy_for_year_pgn ?? '-'} color="#242745" bgColor="rgba(115,103,240,0.08)" />
                                                <SummaryBox label="Avg PGN" value={energyCompanyResp.average_energy_for_year_pgn ?? '-'} color="#219bff" bgColor="rgba(67,186,255,0.116)" />
                                                <SummaryBox label="Util. PGN" value={energyCompanyResp.average_energy_input_pgn ? `${energyCompanyResp.average_energy_input_pgn}%` : '-'} color="#7554ea" bgColor="rgba(154,84,234,0.11)" />
                                            </div>
                                            <div className="flex gap-3 mb-4">
                                                <SummaryBox label="Total PLN" value={energyCompanyResp.total_energy_for_year_pln ?? '-'} color="#242745" bgColor="rgba(115,103,240,0.08)" />
                                                <SummaryBox label="Avg PLN" value={energyCompanyResp.average_energy_for_year_pln ?? '-'} color="#219bff" bgColor="rgba(67,186,255,0.116)" />
                                                <SummaryBox label="Util. PLN" value={energyCompanyResp.average_energy_input_pln ? `${energyCompanyResp.average_energy_input_pln}%` : '-'} color="#7554ea" bgColor="rgba(154,84,234,0.11)" />
                                            </div>
                                            {(() => {
                                                const pgnData = energyCompanyResp.data_pgn ?? [];
                                                const plnData = energyCompanyResp.data_pln ?? [];
                                                const categories = pgnData.map((d: ChartDataPoint) => String(d.x));
                                                const series = [
                                                    { name: 'PGN', data: pgnData.map((d: ChartDataPoint) => (typeof d.y === 'string' ? parseFloat(String(d.y)) : d.y)) },
                                                    { name: 'PLN', data: plnData.map((d: ChartDataPoint) => (typeof d.y === 'string' ? parseFloat(String(d.y)) : d.y)) },
                                                ];
                                                const options: ApexCharts.ApexOptions = {
                                                    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
                                                    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
                                                    dataLabels: { enabled: false },
                                                    colors: ['#7367F0', '#FF9F43'],
                                                    xaxis: { categories },
                                                    yaxis: { labels: { formatter: (v: number) => fmt(v) } },
                                                    grid: { borderColor: '#f1f1f1', strokeDashArray: 4 },
                                                };
                                                return <Chart options={options} series={series} type="bar" height={360} />;
                                            })()}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Row 5: Send-out Chart ──────────────────────────── */}
                    {hasAccess(access, 'chart_penyaluran_gas', isAdmin) && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                <h4 className="text-lg font-semibold text-gray-800">Send-Out Kumulatif</h4>
                                <div className="flex gap-3">
                                    <YearSelect value={sendOutYear} onChange={(v) => setSendOutYear(Number(v))} range={yearRange(dashboardData?.energy_first_year ?? currentYear)} label="Tahun" />
                                    <YearSelect value={sendOutComparisonYear} onChange={setSendOutComparisonYear} range={yearRange(dashboardData?.energy_first_year ?? currentYear)} label="Perbandingan" disableYear={sendOutYear} allowEmpty />
                                </div>
                            </div>
                            {sendOutResp && (() => {
                                const options: ApexCharts.ApexOptions = {
                                    chart: { type: 'bar', stacked: true, toolbar: { show: false }, fontFamily: 'inherit' },
                                    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
                                    dataLabels: { enabled: false },
                                    colors: ['#7367F0', '#FF9F43', '#A0A0A0', '#D4A0FF'],
                                    xaxis: { categories: sendOutResp.categories },
                                    yaxis: { labels: { formatter: (v: number) => fmt(v) } },
                                    grid: { borderColor: '#f1f1f1', strokeDashArray: 4 },
                                    legend: { position: 'top' },
                                };
                                const series = sendOutResp.seriesData.map((s) => ({
                                    name: s.name,
                                    data: s.data,
                                    group: s.group,
                                }));
                                return <Chart options={options} series={series} type="bar" height={400} />;
                            })()}
                        </div>
                    )}

                    {/* ── Row 6: STS / BOG Tabbed Charts ────────────────── */}
                    {statsTabs.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
                            <div className="p-6 pb-0">
                                <h4 className="text-lg font-semibold text-gray-800 mb-4">Data Statistik</h4>
                                <TabBar tabs={statsTabs} activeTab={statsTab} setActiveTab={setStatsTab} />
                            </div>
                            <div className="p-4">
                                {statsTab === 'sts' && (() => {
                                    const { options, series } = buildBarChart(stsChartData, '#00CFE8');
                                    return (
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                                            <div className="flex items-center justify-between p-6 pb-2">
                                                <h4 className="text-lg font-semibold text-gray-800">Jumlah STS</h4>
                                                <YearSelect value={stsYear} onChange={(v) => setStsYear(Number(v))} range={yearRange(dashboardData?.lng_first_year ?? currentYear)} label="Tahun" />
                                            </div>
                                            <div className="px-4 pb-4">
                                                <Chart options={options} series={series} type="bar" height={360} />
                                            </div>
                                        </div>
                                    );
                                })()}
                                {statsTab === 'bog' && (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex flex-wrap items-center justify-between p-6 pb-2 gap-3">
                                            <h4 className="text-lg font-semibold text-gray-800">Boil of Gas (%)</h4>
                                            <div className="flex flex-wrap gap-3">
                                                <YearSelect value={bogYear} onChange={(v) => setBogYear(Number(v))} range={yearRange(dashboardData?.bog_first_year ?? currentYear)} label="Tahun" />
                                                <div className="flex items-center gap-2">
                                                    <label className="text-sm text-gray-500">Type</label>
                                                    <select value={bogType} onChange={(e) => setBogType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00CFE8]">
                                                        <option value="fsru">FSRU</option>
                                                        <option value="tua">TUA</option>
                                                    </select>
                                                </div>
                                                {bogType === 'tua' && (
                                                    <CompanySelect
                                                        value={bogCompany}
                                                        onChange={setBogCompany}
                                                        options={[
                                                            { value: 'total', label: 'Total' },
                                                            { value: 'pgn', label: 'PGN' },
                                                            { value: 'pln', label: 'PLN' },
                                                            { value: 'pgnpln', label: 'PGN & PLN' },
                                                        ]}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div className="px-4 pb-4">
                                            {bogMultiData ? (() => {
                                                const pgnData = bogMultiData.pgn ?? [];
                                                const plnData = bogMultiData.pln ?? [];
                                                const categories = pgnData.map((d: ChartDataPoint) => String(d.x));
                                                const series = [
                                                    { name: 'PGN', data: pgnData.map((d: ChartDataPoint) => (typeof d.y === 'string' ? parseFloat(d.y) : d.y)) },
                                                    { name: 'PLN', data: plnData.map((d: ChartDataPoint) => (typeof d.y === 'string' ? parseFloat(d.y) : d.y)) },
                                                ];
                                                const options: ApexCharts.ApexOptions = {
                                                    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
                                                    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
                                                    dataLabels: { enabled: false },
                                                    colors: ['#7367F0', '#FF9F43'],
                                                    xaxis: { categories },
                                                    yaxis: { labels: { formatter: (v: number) => v.toFixed(5) } },
                                                    grid: { borderColor: '#f1f1f1', strokeDashArray: 4 },
                                                };
                                                return <Chart options={options} series={series} type="bar" height={360} />;
                                            })() : (() => {
                                                const { options, series } = buildBarChart(bogChartData, '#00CFE8', bogTooltip);
                                                return <Chart options={options} series={series} type="bar" height={360} />;
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Row 7: Report Tables ──────────────────────────── */}
                    {reportTabs.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="p-6 pb-0">
                                <h4 className="text-lg font-semibold text-gray-800 mb-4">Rangkuman Laporan</h4>
                                <TabBar tabs={reportTabs} activeTab={reportTab} setActiveTab={setReportTab} />
                            </div>
                            <div className="p-4">
                                <ReportTable
                                    activeTab={reportTab}
                                    tabKey="proyeksi"
                                    dataUrl="/api/dashboard/lng-supply-report"
                                    columns={[
                                        { key: 'cargo_owner_format', label: 'Pemilik Kargo' },
                                        {
                                            key: 'est_departure',
                                            label: 'ETD',
                                            render: (r) => r.est_departure ? new Date(r.est_departure as string).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
                                        },
                                        {
                                            key: 'est_arrival',
                                            label: 'ETA',
                                            render: (r) => r.est_arrival ? new Date(r.est_arrival as string).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
                                        },
                                        { key: 'lng_source', label: 'Sumber LNG' },
                                        { key: 'lng_carrier', label: 'Pengangkut LNG' },
                                        { key: 'terminal', label: 'Terminal' },
                                        { key: 'lng_nominated', label: 'Rencana', render: (r) => fmt(Number(r.lng_nominated ?? 0)) },
                                        { key: 'realization', label: 'Realisasi', render: (r) => fmt(Number(r.realization ?? 0)) },
                                        { key: 'time_left', label: 'Waktu Tersisa' },
                                        { key: 'raw_status', label: 'Status' },
                                    ]}
                                />
                                <ReportTable
                                    activeTab={reportTab}
                                    tabKey="laytime"
                                    dataUrl="/api/dashboard/laytime-report"
                                    columns={[
                                        { key: 'cargo_owner', label: 'Pemilik Kargo' },
                                        { key: 'lng_carrier', label: 'Sumber Kargo' },
                                        { key: 'ship_name', label: 'Kapal' },
                                        { key: 'sts_date', label: 'Tanggal STS' },
                                        { key: 'tank_condition', label: 'Kondisi Tangki' },
                                        { key: 'gross_volume', label: 'Gross Volume', render: (r) => fmt(Number(r.gross_volume ?? 0)) },
                                        { key: 'net_energy', label: 'Net Energy MMBTU', render: (r) => fmt(Number(r.net_energy ?? 0)) },
                                        { key: 'demurrage', label: 'Demurrage' },
                                    ]}
                                />
                                <ReportTable
                                    activeTab={reportTab}
                                    tabKey="nominasi"
                                    dataUrl="/api/dashboard/lng-nomination-report"
                                    columns={[
                                        { key: 'client_name', label: 'Nama Klien' },
                                        {
                                            key: 'nomination_date',
                                            label: 'Nomination Date',
                                            render: (r) => r.nomination_date ? new Date(r.nomination_date as string).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
                                        },
                                        { key: 'tua_bbtud', label: 'TUA (BBTUD)' },
                                        { key: 'pgn_bbtud', label: 'PGN (BBTUD)' },
                                        { key: 'total_bbtud', label: 'Total (BBTUD)' },
                                        { key: 'ghv', label: 'GHV (BTU/SCF)' },
                                        { key: 'tua_mmscfd', label: 'TUA (MMSCFD)' },
                                        { key: 'pgn_mmscfd', label: 'PGN (MMSCFD)' },
                                        { key: 'total_mmscfd', label: 'Total (MMSCFD)' },
                                        { key: 'raw_status', label: 'Status' },
                                    ]}
                                />
                                <ReportTable
                                    activeTab={reportTab}
                                    tabKey="keluhan"
                                    dataUrl="/api/dashboard/keluhan-report"
                                    columns={[
                                        { key: 'no_keluhan', label: 'No Keluhan' },
                                        { key: 'identitas_pelapor', label: 'Pelapor' },
                                        {
                                            key: 'created_at',
                                            label: 'Tanggal Laporan',
                                            render: (r) => r.created_at ? new Date(r.created_at as string).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
                                        },
                                        { key: 'status', label: 'Status' },
                                    ]}
                                />
                                <ReportTable
                                    activeTab={reportTab}
                                    tabKey="administrasi"
                                    dataUrl="/api/dashboard/administrasi-kontrak-report"
                                    columns={[
                                        { key: 'contract_name', label: 'Nama Kontrak' },
                                        { key: 'mitra_name', label: 'Nama Mitra' },
                                        { key: 'category_name', label: 'Kategori' },
                                        {
                                            key: 'start_date',
                                            label: 'Tanggal Mulai',
                                            render: (r) => r.start_date ? new Date(r.start_date as string).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
                                        },
                                        {
                                            key: 'end_date',
                                            label: 'Tanggal Selesai',
                                            render: (r) => r.end_date ? new Date(r.end_date as string).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
                                        },
                                        { key: 'addendums_count', label: 'Adendum', render: (r) => (Number(r.addendums_count) > 0 ? `${r.addendums_count} Adendum` : '-') },
                                        { key: 'status', label: 'Status' },
                                    ]}
                                />
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
