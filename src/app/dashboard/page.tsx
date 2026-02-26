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
} from '@/types/dashboard';
import {
    User,
    Ship,
    Flame,
    BarChart3,
    Activity,
    Calendar,
    CalendarDays,
    Inbox,
    MailCheck,
    ClipboardList,
    MonitorSmartphone,
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

// ─── Sub-components ────────────────────────────────────────────────

function StatCard({
    title,
    items,
}: {
    title: string;
    items: { label: string; value: string | number; icon: React.ReactNode; color: string; bgColor: string }[];
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

function SurveyCard({ data }: { data: DashboardData | null }) {
    if (!data) return null;
    const s = data.surveySummary;
    return (
        <StatCard
            title="Survey Kepuasan Pelanggan"
            items={[
                {
                    label: 'Semester 1',
                    value: s.semester_1 !== 0 ? s.semester_1.toFixed(2) : '-',
                    icon: <span className="font-bold text-base">1</span>,
                    color: '#7367F0',
                    bgColor: 'rgba(115,103,240,0.08)',
                },
                {
                    label: 'Semester 2',
                    value: s.semester_2.toFixed(2),
                    icon: <span className="font-bold text-base">2</span>,
                    color: '#FF9F43',
                    bgColor: 'rgba(255,159,67,0.08)',
                },
            ]}
        />
    );
}

// ─── Chart wrapper ─────────────────────────────────────────────────

function BarChartCard({
    title,
    chartData,
    year,
    setYear,
    yearRange,
    fillColor,
    tooltipRenderer,
}: {
    title: string;
    chartData: ChartDataPoint[];
    year: number;
    setYear: (y: number) => void;
    yearRange: number[];
    fillColor: string;
    tooltipRenderer?: (data: ChartDataPoint) => string;
}) {
    const options: ApexCharts.ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
        dataLabels: { enabled: false },
        colors: [fillColor],
        xaxis: { categories: chartData.map((d) => d.x) },
        yaxis: {
            labels: {
                formatter: (val: number) => new Intl.NumberFormat('id-ID').format(Math.round(val)),
            },
        },
        grid: { borderColor: '#f1f1f1', strokeDashArray: 4 },
        tooltip: tooltipRenderer
            ? {
                custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
                    const d = chartData[dataPointIndex];
                    return tooltipRenderer(d);
                },
            }
            : { y: { formatter: (val: number) => new Intl.NumberFormat('id-ID').format(val) } },
    };

    const series = [{ name: title, data: chartData.map((d) => (typeof d.y === 'string' ? parseFloat(d.y) : d.y)) }];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-6 pb-2">
                <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
                <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00CFE8]"
                >
                    {yearRange.map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
            </div>
            <div className="px-4 pb-4">
                <Chart options={options} series={series} type="bar" height={360} />
            </div>
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

    // Charts
    const [lngChartData, setLngChartData] = useState<ChartDataPoint[]>([]);
    const [energyChartData, setEnergyChartData] = useState<ChartDataPoint[]>([]);
    const [stsChartData, setStsChartData] = useState<ChartDataPoint[]>([]);
    const [bogChartData, setBogChartData] = useState<ChartDataPoint[]>([]);

    const [lngYear, setLngYear] = useState(new Date().getFullYear());
    const [energyYear, setEnergyYear] = useState(new Date().getFullYear());
    const [stsYear, setStsYear] = useState(new Date().getFullYear());
    const [bogYear, setBogYear] = useState(new Date().getFullYear());

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

                // Parallel fetches based on access
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

    // ─── Chart fetchers ────────────────────────────────────────────
    useEffect(() => {
        if (!dashboardData) return;
        if (!hasAccess(access, 'chart_penerimaan_lng', isAdmin)) return;
        const config = getAuthConfig();
        axios
            .get('/api/dashboard/lng-supply-chart', { ...config, params: { year: lngYear } })
            .then((r) => setLngChartData(r.data))
            .catch(() => { });
    }, [lngYear, dashboardData, access, isAdmin]);

    useEffect(() => {
        if (!dashboardData) return;
        if (!hasAccess(access, 'chart_penyaluran_gas', isAdmin)) return;
        const config = getAuthConfig();
        axios
            .get('/api/dashboard/energy-chart', { ...config, params: { year: energyYear } })
            .then((r) => setEnergyChartData(r.data))
            .catch(() => { });
    }, [energyYear, dashboardData, access, isAdmin]);

    useEffect(() => {
        if (!dashboardData) return;
        if (!hasAccess(access, 'chart_jumlah_sts', isAdmin)) return;
        const config = getAuthConfig();
        axios
            .get('/api/dashboard/sts-chart', { ...config, params: { year: stsYear } })
            .then((r) => setStsChartData(r.data))
            .catch(() => { });
    }, [stsYear, dashboardData, access, isAdmin]);

    useEffect(() => {
        if (!dashboardData) return;
        if (!hasAccess(access, 'chart_bog', isAdmin)) return;
        const config = getAuthConfig();
        axios
            .get('/api/dashboard/bog-chart', { ...config, params: { year: bogYear } })
            .then((r) => setBogChartData(r.data))
            .catch(() => { });
    }, [bogYear, dashboardData, access, isAdmin]);

    // ─── Tooltip renderers ─────────────────────────────────────────
    const lngTooltip = (d: ChartDataPoint) =>
        `<div style="padding:12px;font-size:13px"><table>
      <tr><td><b>Total</b></td><td style="padding-left:8px;text-align:right">${new Intl.NumberFormat('id-ID').format(Number(d.y))}</td></tr>
      <tr><td><b>Min</b></td><td style="padding-left:8px;text-align:right">${new Intl.NumberFormat('id-ID').format(Number(d.min))}</td></tr>
      <tr><td><b>Max</b></td><td style="padding-left:8px;text-align:right">${new Intl.NumberFormat('id-ID').format(Number(d.max))}</td></tr>
      <tr><td><b>Avg</b></td><td style="padding-left:8px;text-align:right">${new Intl.NumberFormat('id-ID').format(Number(d.mean))}</td></tr>
    </table></div>`;

    const energyTooltip = (d: ChartDataPoint) =>
        `<div style="padding:12px;font-size:13px"><table>
      <tr><td><b>Total</b></td><td style="padding-left:8px;text-align:right">${d.value}</td></tr>
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
                                <h4 className="text-lg font-semibold text-gray-800 mb-5">Survey Kepuasan Pelanggan</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[#7367F0] bg-[rgba(115,103,240,0.08)] font-bold">
                                                1
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Semester 1</p>
                                                <p className="text-lg font-semibold">
                                                    {dashboardData?.surveySummary.semester_1
                                                        ? dashboardData.surveySummary.semester_1.toFixed(2)
                                                        : '-'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[#FF9F43] bg-[rgba(255,159,67,0.08)] font-bold">
                                                2
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Semester 2</p>
                                                <p className="text-lg font-semibold">
                                                    {dashboardData?.surveySummary.semester_2?.toFixed(2) ?? '0.00'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-[#28C76F] bg-[rgba(40,199,111,0.08)]">
                                                <ClipboardList className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-lg text-gray-400">Total</p>
                                                <p className="text-2xl font-bold text-gray-800">
                                                    {dashboardData?.surveySummary.total?.toFixed(2) ?? '0.00'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {hasAccess(access, 'card_keluhan_pelanggan', isAdmin) && (
                            <StatCard
                                title="Keluhan Pelanggan"
                                items={[
                                    {
                                        label: 'Aktif',
                                        value: keluhan?.open ?? '-',
                                        icon: <Inbox className="w-5 h-5" />,
                                        color: '#EA5455',
                                        bgColor: 'rgba(234,84,85,0.08)',
                                    },
                                    {
                                        label: 'Selesai',
                                        value: keluhan?.closed ?? '-',
                                        icon: <MailCheck className="w-5 h-5" />,
                                        color: '#28C76F',
                                        bgColor: 'rgba(40,199,111,0.08)',
                                    },
                                ]}
                            />
                        )}
                    </div>

                    {/* ── Row 2: LNG + Energy + BOG cards ───────────────── */}
                    {(hasAccess(access, 'card_penerimaan_lng', isAdmin) ||
                        hasAccess(access, 'card_penyaluran_gas', isAdmin) ||
                        hasAccess(access, 'card_bog', isAdmin)) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                {hasAccess(access, 'card_penerimaan_lng', isAdmin) && (
                                    <StatCard
                                        title="Penerimaan LNG"
                                        items={[
                                            {
                                                label: `Tahun ${currentYear} (m³)`,
                                                value: lngSupply?.current_year ?? '-',
                                                icon: <BarChart3 className="w-5 h-5" />,
                                                color: '#7367F0',
                                                bgColor: 'rgba(115,103,240,0.08)',
                                            },
                                            {
                                                label: 'Total (m³)',
                                                value: lngSupply?.all_data ?? '-',
                                                icon: <MonitorSmartphone className="w-5 h-5" />,
                                                color: '#FF9F43',
                                                bgColor: 'rgba(255,159,67,0.08)',
                                            },
                                        ]}
                                    />
                                )}

                                {hasAccess(access, 'card_penyaluran_gas', isAdmin) && (
                                    <StatCard
                                        title="Penyaluran Gas"
                                        items={[
                                            {
                                                label: `Tahun ${currentYear} (MMBTU)`,
                                                value: energyDelivery?.current_year ?? '-',
                                                icon: <Ship className="w-5 h-5" />,
                                                color: '#EA5455',
                                                bgColor: 'rgba(234,84,85,0.08)',
                                            },
                                            {
                                                label: 'Total (MMBTU)',
                                                value: energyDelivery?.all_data ?? '-',
                                                icon: <MonitorSmartphone className="w-5 h-5" />,
                                                color: '#28C76F',
                                                bgColor: 'rgba(40,199,111,0.08)',
                                            },
                                        ]}
                                    />
                                )}

                                {hasAccess(access, 'card_bog', isAdmin) && (
                                    <StatCard
                                        title="Boil of Gas (BoG)"
                                        items={[
                                            {
                                                label: `BOG Terakhir ${bogSummary?.bog_date ? new Date(bogSummary.bog_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} (%)`,
                                                value: bogSummary?.bog_daily ?? '-',
                                                icon: <Calendar className="w-5 h-5" />,
                                                color: '#7367F0',
                                                bgColor: 'rgba(115,103,240,0.08)',
                                            },
                                            {
                                                label: `Bulan ${currentMonthName} (%)`,
                                                value: bogSummary?.bog_monthly ?? '-',
                                                icon: <CalendarDays className="w-5 h-5" />,
                                                color: '#FF9F43',
                                                bgColor: 'rgba(255,159,67,0.08)',
                                            },
                                        ]}
                                    />
                                )}
                            </div>
                        )}

                    {/* ── Row 3: LNG Chart + Energy Chart ───────────────── */}
                    {(hasAccess(access, 'chart_penerimaan_lng', isAdmin) ||
                        hasAccess(access, 'chart_penyaluran_gas', isAdmin)) && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                {hasAccess(access, 'chart_penerimaan_lng', isAdmin) && (
                                    <BarChartCard
                                        title="Penerimaan LNG (m³)"
                                        chartData={lngChartData}
                                        year={lngYear}
                                        setYear={setLngYear}
                                        yearRange={yearRange(dashboardData?.lng_first_year ?? currentYear)}
                                        fillColor="#7367F0"
                                        tooltipRenderer={lngTooltip}
                                    />
                                )}
                                {hasAccess(access, 'chart_penyaluran_gas', isAdmin) && (
                                    <BarChartCard
                                        title="Penyaluran Gas (MMBTUD)"
                                        chartData={energyChartData}
                                        year={energyYear}
                                        setYear={setEnergyYear}
                                        yearRange={yearRange(dashboardData?.energy_first_year ?? currentYear)}
                                        fillColor="#28C76F"
                                        tooltipRenderer={energyTooltip}
                                    />
                                )}
                            </div>
                        )}

                    {/* ── Row 4: STS / BOG Tabbed Charts ────────────────── */}
                    {statsTabs.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
                            <div className="p-6 pb-0">
                                <h4 className="text-lg font-semibold text-gray-800 mb-4">Data Statistik</h4>
                                <div className="flex border-b border-gray-200">
                                    {statsTabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setStatsTab(tab.key)}
                                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${statsTab === tab.key
                                                    ? 'border-[#00CFE8] text-[#00CFE8]'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4">
                                {statsTab === 'sts' && (
                                    <BarChartCard
                                        title="Jumlah STS"
                                        chartData={stsChartData}
                                        year={stsYear}
                                        setYear={setStsYear}
                                        yearRange={yearRange(dashboardData?.lng_first_year ?? currentYear)}
                                        fillColor="#00CFE8"
                                    />
                                )}
                                {statsTab === 'bog' && (
                                    <BarChartCard
                                        title="Boil of Gas (%)"
                                        chartData={bogChartData}
                                        year={bogYear}
                                        setYear={setBogYear}
                                        yearRange={yearRange(dashboardData?.bog_first_year ?? currentYear)}
                                        fillColor="#00CFE8"
                                        tooltipRenderer={bogTooltip}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Row 5: Report Tables ──────────────────────────── */}
                    {reportTabs.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="p-6 pb-0">
                                <h4 className="text-lg font-semibold text-gray-800 mb-4">Rangkuman Laporan</h4>
                                <div className="flex border-b border-gray-200 overflow-x-auto">
                                    {reportTabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setReportTab(tab.key)}
                                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${reportTab === tab.key
                                                    ? 'border-[#00CFE8] text-[#00CFE8]'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
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
                                        { key: 'lng_nominated', label: 'Rencana', render: (r) => new Intl.NumberFormat('id-ID').format(Number(r.lng_nominated ?? 0)) },
                                        { key: 'realization', label: 'Realisasi', render: (r) => new Intl.NumberFormat('id-ID').format(Number(r.realization ?? 0)) },
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
                                        { key: 'gross_volume', label: 'Gross Volume', render: (r) => new Intl.NumberFormat('id-ID').format(Number(r.gross_volume ?? 0)) },
                                        { key: 'net_energy', label: 'Net Energy MMBTU', render: (r) => new Intl.NumberFormat('id-ID').format(Number(r.net_energy ?? 0)) },
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
