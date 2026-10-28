import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  MapTrifold, List as ListIcon, Funnel, X, Sun, Moon,
  Phone, ArrowSquareOut, CaretRight, CaretLeft, CaretDown,
  Crosshair, Printer, Info, Warning, ArrowsCounterClockwise,
  CheckCircle, Sparkle, User, SignOut, LockKey
} from '@phosphor-icons/react';
import { useData } from './hooks/useData';
import {
  computeGapAnalysis, getGapLabel, getGapLabelKn, getGoogleMapsUrl, getPhoneUrl,
  formatPopulation, formatDistance, getDistricts, getServiceTypes,
  getCentreTypes, computeWhatIf
} from './utils/gapAnalysis';
import { t } from './i18n/translations';
import GapMap from './components/GapMap';
import AuthView from './components/AuthView';
import InsightsView from './components/InsightsView';
import AIAssistantDrawer from './components/AIAssistantDrawer';
import WorkflowsView from './components/WorkflowsView';
import CaseTrackerView from './components/CaseTrackerView';
import CaseInterpreterView from './components/CaseInterpreterView';
import { fetchUserCases } from './lib/caseService';
import { useAuth } from './context/AuthContext';
import type { ViewMode, Language, Centre, AreaWithGap, NavigatorAnswers, UserCase } from './types';

function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value <= 0) return;
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{value > 0 ? formatPopulation(display) : '0'}</>;
}

function App() {
  const { user, isGuest, isAuthenticated, signOut } = useAuth();
  const { centres, areas, loading, error } = useData();

  // Read initial route and params from URL
  const [view, setView] = useState<ViewMode>(() => {
    const path = window.location.pathname.replace(/^\//, '');
    const validViews: ViewMode[] = ['overview', 'explorer', 'insights', 'workflows', 'cases', 'interpreter', 'navigator', 'login', 'signup'];
    if (validViews.includes(path as ViewMode)) {
      return path as ViewMode;
    }
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    if (v && validViews.includes(v as ViewMode)) {
      return v as ViewMode;
    }
    return 'overview';
  });

  const [threshold, setThreshold] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const tVal = Number(params.get('threshold'));
    return tVal && tVal >= 10 && tVal <= 50 ? tVal : 25;
  });

  const [selectedDistrict, setSelectedDistrict] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('district') || '';
  });

  const [selectedService, setSelectedService] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('service') || '';
  });

  const [lang, setLang] = useState<Language>('en');
  const [dark, setDark] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [selectedCentre, setSelectedCentre] = useState<Centre | null>(null);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<AreaWithGap | null>(null);
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [whatIfPos, setWhatIfPos] = useState<{ lat: number; lng: number } | null>(null);
  const [showMobileList, setShowMobileList] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null);
  const [prefillWorkflow, setPrefillWorkflow] = useState<{ workflowId: string; title: string; forum: string } | null>(null);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string | null>(null);
  const [myHelpMenuOpen, setMyHelpMenuOpen] = useState(false);
  const [userCases, setUserCases] = useState<UserCase[]>([]);

  const [navStep, setNavStep] = useState(0);
  const [navAnswers, setNavAnswers] = useState<NavigatorAnswers>({
    issue_type: null, urgency: null, affected_party: null,
    income_category: null, language_pref: null,
  });

  // Keep URL updated with state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (threshold !== 25) params.set('threshold', String(threshold));
    if (selectedDistrict) params.set('district', selectedDistrict);
    if (selectedService) params.set('service', selectedService);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const pathname = view === 'overview' ? '/' : `/${view}`;
    const targetUrl = `${pathname}${queryString}`;

    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.replaceState({}, '', targetUrl);
    }
  }, [view, threshold, selectedDistrict, selectedService]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '');
      const validViews: ViewMode[] = ['overview', 'explorer', 'insights', 'workflows', 'cases', 'interpreter', 'navigator', 'login', 'signup'];
      if (validViews.includes(path as ViewMode)) {
        setView(path as ViewMode);
      } else {
        setView('overview');
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('threshold')) setThreshold(Number(params.get('threshold')));
      if (params.get('district') !== null) setSelectedDistrict(params.get('district') || '');
      if (params.get('service') !== null) setSelectedService(params.get('service') || '');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch user cases when user or auth changes
  useEffect(() => {
    const currentUserId = user?.id || (isGuest ? 'demo_user' : 'guest');
    fetchUserCases(currentUserId).then(setUserCases).catch(() => {});
  }, [user, isGuest, view]);

  // Protected route guard
  const navigateToView = useCallback((targetView: ViewMode) => {
    if (targetView === 'insights' && !isAuthenticated) {
      setRedirectAfterAuth('insights');
      setView('login');
      return;
    }
    if (targetView === 'cases' && !isAuthenticated) {
      setRedirectAfterAuth('cases');
      setView('login');
      return;
    }
    setView(targetView);
  }, [isAuthenticated]);

  const handleOpenAssistant = () => {
    if (!isAuthenticated) {
      setRedirectAfterAuth('assistant');
      setView('login');
      return;
    }
    setAssistantOpen(true);
  };

  const handleAuthSuccess = () => {
    if (redirectAfterAuth === 'assistant') {
      setRedirectAfterAuth(null);
      setAssistantOpen(true);
      setView('overview');
    } else {
      const dest = redirectAfterAuth || 'insights';
      setRedirectAfterAuth(null);
      setView(dest as ViewMode);
    }
  };

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Filter centres
  const filteredCentres = useMemo(() => {
    return centres.filter((c) => {
      if (selectedDistrict && c.district !== selectedDistrict) return false;
      if (selectedService && !c.services.includes(selectedService)) return false;
      if (selectedType && c.type !== selectedType) return false;
      return true;
    });
  }, [centres, selectedDistrict, selectedService, selectedType]);

  // Gap analysis
  const { areasWithGap, summary } = useMemo(() => {
    if (areas.length === 0 || filteredCentres.length === 0) {
      return {
        areasWithGap: [],
        summary: {
          total_areas: 0, areas_beyond_threshold: 0, people_beyond_threshold: 0,
          threshold_km: threshold, top_underserved: [], avg_distance_km: 0,
        },
      };
    }
    return computeGapAnalysis(areas, filteredCentres, threshold);
  }, [areas, filteredCentres, threshold]);

  // Filter areas by district
  const filteredAreas = useMemo(() => {
    if (!selectedDistrict) return areasWithGap;
    return areasWithGap.filter((a) => a.district === selectedDistrict);
  }, [areasWithGap, selectedDistrict]);

  // What-if computation
  const whatIfResult = useMemo(() => {
    if (!whatIfPos || !whatIfMode) return null;
    return computeWhatIf(areasWithGap, whatIfPos.lat, whatIfPos.lng, threshold);
  }, [whatIfPos, whatIfMode, areasWithGap, threshold]);

  // Districts, services, types for filters
  const districts = useMemo(() => getDistricts(areas), [areas]);
  const serviceTypes = useMemo(() => getServiceTypes(centres), [centres]);
  const centreTypes = useMemo(() => getCentreTypes(centres), [centres]);

  // Real coverage curve calculation for Overview finding section
  const coverageCurve = useMemo(() => {
    if (areasWithGap.length === 0) return [];
    const points = [10, 15, 20, 25, 30, 40, 50, 75];
    const total = areasWithGap.length;
    return points.map((km) => {
      const covered = areasWithGap.filter((a) => a.nearest_km <= km).length;
      const pct = Math.round((covered / total) * 100);
      return { km, pct, count: covered };
    });
  }, [areasWithGap]);

  // Plain methodology data metrics computed from real dataset
  const methodologyMetrics = useMemo(() => {
    const verifiedCentres = centres.filter((c) => !c.is_sample).length;
    const sampleCentres = centres.filter((c) => c.is_sample).length;
    const verifiedAreas = areas.filter((a) => !a.is_sample).length;
    const sampleAreas = areas.filter((a) => a.is_sample).length;
    const dates = centres.map((c) => c.last_verified).filter(Boolean).sort();
    return {
      verifiedCentres,
      sampleCentres,
      verifiedAreas,
      sampleAreas,
      oldestVerified: dates[0] || '2026-01-15',
      latestVerified: dates[dates.length - 1] || '2026-03-28',
    };
  }, [centres, areas]);


  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (whatIfMode) {
        setWhatIfPos({ lat, lng });
      }
    },
    [whatIfMode]
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Navigator logic
  const navigatorQuestions = [
    {
      key: 'issue_type' as const,
      label: t('nav_q1', lang),
      options: [
        { value: 'family', label: t('issue_family', lang) },
        { value: 'property', label: t('issue_property', lang) },
        { value: 'criminal', label: t('issue_criminal', lang) },
        { value: 'labour', label: t('issue_labour', lang) },
        { value: 'consumer', label: t('issue_consumer', lang) },
        { value: 'sc_st', label: t('issue_sc_st', lang) },
        { value: 'women', label: t('issue_women', lang) },
        { value: 'child', label: t('issue_child', lang) },
        { value: 'other', label: t('issue_other', lang) },
      ],
    },
    {
      key: 'urgency' as const,
      label: t('nav_q2', lang),
      options: [
        { value: 'immediate', label: t('urgency_immediate', lang) },
        { value: 'weeks', label: t('urgency_weeks', lang) },
        { value: 'months', label: t('urgency_months', lang) },
        { value: 'info', label: t('urgency_info', lang) },
      ],
    },
    {
      key: 'affected_party' as const,
      label: t('nav_q3', lang),
      options: [
        { value: 'self', label: t('affected_self', lang) },
        { value: 'family', label: t('affected_family', lang) },
        { value: 'community', label: t('affected_community', lang) },
        { value: 'other', label: t('affected_other', lang) },
      ],
    },
    {
      key: 'income_category' as const,
      label: t('nav_q4', lang),
      options: [
        { value: 'below_1', label: t('income_below_1', lang) },
        { value: '1_3', label: t('income_1_3', lang) },
        { value: '3_5', label: t('income_3_5', lang) },
        { value: 'above_5', label: t('income_above_5', lang) },
      ],
    },
    {
      key: 'language_pref' as const,
      label: t('nav_q5', lang),
      options: [
        { value: 'Kannada', label: t('lang_kannada', lang) },
        { value: 'English', label: t('lang_english', lang) },
        { value: 'Hindi', label: t('lang_hindi', lang) },
        { value: 'Other', label: t('lang_other', lang) },
      ],
    },
  ];

  // Navigator result computation
  const navigatorResults = useMemo(() => {
    if (navStep < navigatorQuestions.length) return null;
    
    // Filter centres based on answers
    let relevantCentres = [...centres];
    
    if (navAnswers.language_pref && navAnswers.language_pref !== 'Other') {
      const langMatch = relevantCentres.filter(c => c.languages.includes(navAnswers.language_pref!));
      if (langMatch.length > 0) relevantCentres = langMatch;
    }

    // Priority-based sorting: DLSA > SLSA > TLSC > NGO
    const typePriority: Record<string, number> = { DLSA: 1, SLSA: 2, TLSC: 3, NGO: 4, 'Legal Aid Clinic': 5 };
    relevantCentres.sort((a, b) => (typePriority[a.type] || 99) - (typePriority[b.type] || 99));

    // Resources based on issue type
    const resources = [
      {
        name: 'NALSA Toll-Free Helpline',
        name_kn: 'ನಾಲ್ಸಾ ಉಚಿತ ಸಹಾಯವಾಣಿ',
        description: 'Call 15100 for free legal aid assistance (24×7)',
        description_kn: 'ಉಚಿತ ಕಾನೂನು ನೆರವು ಸಹಾಯಕ್ಕಾಗಿ 15100 ಗೆ ಕರೆ ಮಾಡಿ (24×7)',
        url: 'tel:15100',
      },
      {
        name: 'KSLSA Website',
        name_kn: 'ಕೆಎಸ್ಎಲ್ಎಸ್ಎ ವೆಬ್‌ಸೈಟ್',
        description: 'Karnataka State Legal Services Authority official portal',
        description_kn: 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಕಾನೂನು ಸೇವೆಗಳ ಪ್ರಾಧಿಕಾರ ಅಧಿಕೃತ ಪೋರ್ಟಲ್',
        url: 'https://kslsa.kar.nic.in/',
      },
      {
        name: 'NALSA Website',
        name_kn: 'ನಾಲ್ಸಾ ವೆಬ್‌ಸೈಟ್',
        description: 'National Legal Services Authority - apply for free legal aid online',
        description_kn: 'ರಾಷ್ಟ್ರೀಯ ಕಾನೂನು ಸೇವೆಗಳ ಪ್ರಾಧಿಕಾರ - ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಉಚಿತ ಕಾನೂನು ನೆರವಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
        url: 'https://nalsa.gov.in/',
      },
    ];

    if (navAnswers.issue_type === 'women') {
      resources.unshift({
        name: 'Women Helpline',
        name_kn: 'ಮಹಿಳಾ ಸಹಾಯವಾಣಿ',
        description: 'Call 181 for women in distress (24×7)',
        description_kn: 'ಸಂಕಷ್ಟದಲ್ಲಿರುವ ಮಹಿಳೆಯರಿಗೆ 181 ಗೆ ಕರೆ ಮಾಡಿ (24×7)',
        url: 'tel:181',
      });
    }

    if (navAnswers.issue_type === 'child') {
      resources.unshift({
        name: 'Childline',
        name_kn: 'ಚೈಲ್ಡ್‌ಲೈನ್',
        description: 'Call 1098 for children in need of care and protection',
        description_kn: 'ರಕ್ಷಣೆ ಅಗತ್ಯವಿರುವ ಮಕ್ಕಳಿಗೆ 1098 ಗೆ ಕರೆ ಮಾಡಿ',
        url: 'tel:1098',
      });
    }

    if (navAnswers.urgency === 'immediate') {
      resources.unshift({
        name: 'Police Emergency',
        name_kn: 'ಪೊಲೀಸ್ ತುರ್ತು',
        description: 'Call 100 or 112 for immediate police assistance',
        description_kn: 'ತಕ್ಷಣದ ಪೊಲೀಸ್ ಸಹಾಯಕ್ಕೆ 100 ಅಥವಾ 112 ಗೆ ಕರೆ ಮಾಡಿ',
        url: 'tel:112',
      });
    }

    // Checklist based on situation
    const checklist = [
      { item: 'Government-issued photo ID (Aadhaar, Voter ID, PAN)', item_kn: 'ಸರ್ಕಾರಿ ಫೋಟೋ ಗುರುತಿನ ಚೀಟಿ (ಆಧಾರ್, ಮತದಾರ ಗುರುತಿನ ಚೀಟಿ, ಪ್ಯಾನ್)' },
      { item: 'Income certificate or BPL card (if applicable)', item_kn: 'ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ ಅಥವಾ BPL ಕಾರ್ಡ್ (ಅನ್ವಯವಾದಲ್ಲಿ)' },
      { item: 'All relevant documents and their photocopies', item_kn: 'ಎಲ್ಲಾ ಸಂಬಂಧಿತ ದಾಖಲೆಗಳು ಮತ್ತು ಅವುಗಳ ಜೆರಾಕ್ಸ್ ಪ್ರತಿಗಳು' },
      { item: 'Written summary of your case/issue in chronological order', item_kn: 'ನಿಮ್ಮ ಪ್ರಕರಣ/ಸಮಸ್ಯೆಯ ಲಿಖಿತ ಸಾರಾಂಶ ಕಾಲಾನುಕ್ರಮದಲ್ಲಿ' },
      { item: 'Contact details (your phone, address)', item_kn: 'ಸಂಪರ್ಕ ವಿವರಗಳು (ನಿಮ್ಮ ಫೋನ್, ವಿಳಾಸ)' },
    ];

    if (navAnswers.issue_type === 'property') {
      checklist.push(
        { item: 'Property documents (sale deed, khata, tax receipts)', item_kn: 'ಆಸ್ತಿ ದಾಖಲೆಗಳು (ಮಾರಾಟ ಪತ್ರ, ಖಾತಾ, ತೆರಿಗೆ ರಶೀದಿ)' },
        { item: 'Survey/mutation records', item_kn: 'ಸಮೀಕ್ಷೆ/ಪಹಣಿ ದಾಖಲೆಗಳು' },
      );
    }

    if (navAnswers.issue_type === 'family') {
      checklist.push(
        { item: 'Marriage certificate', item_kn: 'ವಿವಾಹ ಪ್ರಮಾಣಪತ್ರ' },
        { item: 'Family photos, communication records', item_kn: 'ಕುಟುಂಬ ಫೋಟೋಗಳು, ಸಂವಹನ ದಾಖಲೆಗಳು' },
      );
    }

    if (navAnswers.issue_type === 'criminal') {
      checklist.push(
        { item: 'FIR copy (if filed)', item_kn: 'FIR ಪ್ರತಿ (ದಾಖಲಿಸಿದ್ದರೆ)' },
        { item: 'Bail order / court orders (if any)', item_kn: 'ಜಾಮೀನು ಆದೇಶ / ನ್ಯಾಯಾಲಯ ಆದೇಶಗಳು (ಇದ್ದರೆ)' },
      );
    }

    if (navAnswers.issue_type === 'labour') {
      checklist.push(
        { item: 'Employment letter / salary slips', item_kn: 'ಉದ್ಯೋಗ ಪತ್ರ / ಸಂಬಳ ಚೀಟಿಗಳು' },
        { item: 'PF/ESI details', item_kn: 'PF/ESI ವಿವರಗಳು' },
      );
    }

    return {
      centres: relevantCentres.slice(0, 5),
      resources,
      checklist,
    };
  }, [navStep, navAnswers, centres, navigatorQuestions.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-surface-0)' }}>
        <div className="text-center">
          <div className="skeleton w-16 h-16 rounded-full mx-auto mb-4" />
          <p className="font-label" style={{ color: 'var(--color-ink-secondary)' }}>{t('loading', lang)}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-surface-0)' }}>
        <div className="text-center p-8 rounded-xl" style={{ background: 'var(--color-surface-1)' }}>
          <Warning size={48} className="mx-auto mb-4" style={{ color: 'var(--color-status-danger)' }} />
          <p className="font-body" style={{ color: 'var(--color-ink-primary)' }}>{t('error', lang)}</p>
        </div>
      </div>
    );
  }

  const hasSampleData = centres.some((c) => c.is_sample) || areas.some((a) => a.is_sample);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface-0)', color: 'var(--color-ink-primary)' }}>
      {/* ===== HEADER ===== */}
      <header
        className="no-print sticky top-0 z-50 border-b h-16 md:h-[72px] px-4 md:px-8 flex items-center justify-between gap-4 backdrop-blur-md bg-[var(--color-surface-0)]/95 border-[var(--color-surface-2)]"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateToView('overview')}
            className="flex items-baseline gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded"
          >
            <span className="font-semibold text-lg md:text-xl tracking-tight text-[var(--color-ink-primary)]">
              Nyaya<span className="text-[var(--color-accent)] font-normal mx-[1px]">-</span>Maarg
            </span>
            <span className="hidden lg:inline text-xs text-[var(--color-ink-tertiary)] pl-2 border-l border-[var(--color-surface-2)]">
              {t('app_subtitle', lang)}
            </span>
          </button>
        </div>

        {/* Nav tabs (<= 5 primary items) */}
        <nav className="hidden md:flex items-center gap-1 rounded-lg p-1 bg-[var(--color-surface-1)] border border-[var(--color-surface-2)]">
          <button
            onClick={() => navigateToView('overview')}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: view === 'overview' ? 'var(--color-surface-0)' : 'transparent',
              color: view === 'overview' ? 'var(--color-accent)' : 'var(--color-ink-secondary)',
              boxShadow: view === 'overview' ? 'var(--shadow-sm)' : 'none',
              fontFamily: 'var(--font-sans)',
            }}
            aria-current={view === 'overview' ? 'page' : undefined}
          >
            <span>{t('overview', lang)}</span>
          </button>

          <button
            onClick={() => navigateToView('explorer')}
            className="flex items-center gap-1 px-3.5 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: view === 'explorer' ? 'var(--color-surface-0)' : 'transparent',
              color: view === 'explorer' ? 'var(--color-accent)' : 'var(--color-ink-secondary)',
              boxShadow: view === 'explorer' ? 'var(--shadow-sm)' : 'none',
              fontFamily: 'var(--font-sans)',
            }}
            aria-current={view === 'explorer' ? 'page' : undefined}
          >
            <span>{t('explorer', lang)}</span>
          </button>

          <button
            onClick={() => navigateToView('insights')}
            className="flex items-center gap-1 px-3.5 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: view === 'insights' ? 'var(--color-surface-0)' : 'transparent',
              color: view === 'insights' ? 'var(--color-accent)' : 'var(--color-ink-secondary)',
              boxShadow: view === 'insights' ? 'var(--shadow-sm)' : 'none',
              fontFamily: 'var(--font-sans)',
            }}
            aria-current={view === 'insights' ? 'page' : undefined}
          >
            <span>{t('insights', lang)}</span>
            {!isAuthenticated && <LockKey size={13} className="opacity-60" />}
          </button>

          <button
            onClick={() => navigateToView('workflows')}
            className="flex items-center gap-1 px-3.5 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: view === 'workflows' ? 'var(--color-surface-0)' : 'transparent',
              color: view === 'workflows' ? 'var(--color-accent)' : 'var(--color-ink-secondary)',
              boxShadow: view === 'workflows' ? 'var(--shadow-sm)' : 'none',
              fontFamily: 'var(--font-sans)',
            }}
            aria-current={view === 'workflows' ? 'page' : undefined}
          >
            <span>{t('workflows', lang)}</span>
          </button>

          {/* 5th Item: "My Legal Help ▾" Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMyHelpMenuOpen(!myHelpMenuOpen)}
              className="flex items-center gap-1 px-3.5 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                background: ['cases', 'interpreter', 'navigator'].includes(view) ? 'var(--color-surface-0)' : 'transparent',
                color: ['cases', 'interpreter', 'navigator'].includes(view) ? 'var(--color-accent)' : 'var(--color-ink-secondary)',
                boxShadow: ['cases', 'interpreter', 'navigator'].includes(view) ? 'var(--shadow-sm)' : 'none',
                fontFamily: 'var(--font-sans)',
              }}
              aria-expanded={myHelpMenuOpen}
            >
              <span>{t('my_legal_help', lang)}</span>
              <CaretDown size={13} weight="bold" />
            </button>

            {myHelpMenuOpen && (
              <div
                className="absolute left-0 mt-1.5 w-52 py-2 rounded-xl border shadow-lg z-50 text-xs"
                style={{
                  background: 'var(--color-surface-0)',
                  borderColor: 'var(--color-surface-2)',
                }}
              >
                <button
                  onClick={() => {
                    setMyHelpMenuOpen(false);
                    navigateToView('cases');
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    📁 {t('cases', lang)}
                  </span>
                  {!isAuthenticated && <LockKey size={13} className="text-neutral-400" />}
                </button>
                <button
                  onClick={() => {
                    setMyHelpMenuOpen(false);
                    navigateToView('interpreter');
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    📄 {t('interpreter', lang)}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setMyHelpMenuOpen(false);
                    navigateToView('navigator');
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    🧭 {t('navigator', lang)}
                  </span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* AI Assistant Launcher */}
          <button
            onClick={handleOpenAssistant}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 shadow-sm"
            style={{ background: 'var(--color-accent)', color: '#ffffff' }}
            title={lang === 'kn' ? 'AI ಸಹಾಯಕ ತೆರೆಯಿರಿ' : 'Open AI Assistant'}
            aria-label={t('assistant', lang)}
          >
            <Sparkle size={15} weight="fill" />
            <span className="hidden sm:inline">{t('assistant', lang)}</span>
          </button>

          {/* Guest Mode Indicator */}
          {isGuest && (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{
                background: 'var(--color-sample-badge-bg)',
                color: 'var(--color-sample-badge)',
                borderColor: 'var(--color-sample-badge)',
              }}
            >
              <User size={12} weight="bold" />
              <span>{t('guest_demo', lang)}</span>
            </span>
          )}

          {/* User Profile / Auth State */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                style={{
                  background: 'var(--color-surface-1)',
                  borderColor: 'var(--color-surface-2)',
                  color: 'var(--color-ink-primary)',
                }}
                aria-expanded={userMenuOpen}
              >
                <User size={14} />
                <span className="hidden lg:inline max-w-[100px] truncate">{user.email?.split('@')[0]}</span>
                <CaretDown size={12} />
              </button>
              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-48 py-2 rounded-xl border shadow-lg z-50 text-xs"
                  style={{
                    background: 'var(--color-surface-0)',
                    borderColor: 'var(--color-surface-2)',
                  }}
                >
                  <div className="px-3 py-1.5 border-b mb-1 truncate text-[11px]" style={{ color: 'var(--color-ink-secondary)', borderColor: 'var(--color-surface-2)' }}>
                    {user.email}
                  </div>
                  <button
                    onClick={() => { signOut(); setUserMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[var(--color-surface-1)] transition-colors"
                    style={{ color: 'var(--color-status-danger)' }}
                  >
                    <SignOut size={16} />
                    <span>{t('sign_out', lang)}</span>
                  </button>
                </div>
              )}
            </div>
          ) : isGuest ? (
            <button
              onClick={() => signOut()}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-[var(--color-surface-1)]"
              style={{ borderColor: 'var(--color-surface-2)', color: 'var(--color-ink-secondary)' }}
              title={lang === 'kn' ? 'ಅತಿಥಿ ನಿರ್ಗಮಿಸಿ' : 'Exit Guest'}
            >
              {t('sign_out', lang)}
            </button>
          ) : (
            <button
              onClick={() => setView('login')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-[var(--color-surface-1)]"
              style={{
                background: 'var(--color-surface-1)',
                borderColor: 'var(--color-surface-2)',
                color: 'var(--color-ink-primary)',
              }}
            >
              {t('sign_in', lang)}
            </button>
          )}

          <button
            onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}
            className="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-secondary)', fontFamily: lang === 'en' ? 'var(--font-kannada)' : 'var(--font-sans)' }}
            aria-label="Toggle language"
          >
            {t('language_toggle', lang)}
          </button>
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-md transition-colors"
            style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-secondary)' }}
            aria-label={dark ? t('light_mode', lang) : t('dark_mode', lang)}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden no-print flex items-center gap-1 px-4 py-2 border-b overflow-x-auto" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-surface-2)' }}>
        {(['overview', 'explorer', 'insights', 'workflows', 'cases', 'interpreter', 'navigator'] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => navigateToView(v)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all text-center whitespace-nowrap flex items-center justify-center gap-1 shrink-0"
            style={{
              background: view === v ? 'var(--color-surface-0)' : 'transparent',
              color: view === v ? 'var(--color-accent)' : 'var(--color-ink-secondary)',
              boxShadow: view === v ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <span>
              {v === 'overview'
                ? t('overview', lang)
                : v === 'explorer'
                ? t('explorer', lang)
                : v === 'insights'
                ? t('insights', lang)
                : v === 'workflows'
                ? t('workflows', lang)
                : v === 'cases'
                ? t('cases', lang)
                : v === 'interpreter'
                ? t('interpreter', lang)
                : t('navigator', lang)}
            </span>
            {(v === 'insights' || v === 'cases') && !isAuthenticated && <LockKey size={11} className="opacity-60" />}
          </button>
        ))}
      </nav>

      {/* ===== OVERVIEW VIEW ===== */}
      {view === 'overview' && (
        <div className="w-full">
          {/* SECTION 1: HERO (Fits 100dvh, max 4 text elements, live map with path vectors) */}
          <section className="relative w-full border-b border-[var(--color-surface-2)] bg-[var(--color-surface-0)] min-h-[calc(100dvh-60px)] md:min-h-[calc(100dvh-72px)] lg:h-[calc(100dvh-72px)] flex flex-col justify-between">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch flex-1">
              
              {/* Left Column: Exactly 4 text elements + tactile CTAs */}
              <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
                
                {/* 1. Headline (max 2 lines, computed sentence, tabular mono figures) */}
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight leading-[1.14] text-[var(--color-ink-primary)]">
                  <span className="font-mono text-[var(--color-status-danger)] tabular-nums font-bold">
                    <AnimatedNumber value={summary.areas_beyond_threshold} />
                  </span>{' '}
                  {lang === 'en'
                    ? <>taluks are more than <span className="font-mono text-[var(--color-ink-primary)] font-semibold">{threshold} km</span> from the nearest mapped legal aid centre.</>
                    : <>ತಾಲ್ಲೂಕುಗಳಲ್ಲಿ <span className="font-mono text-[var(--color-ink-primary)] font-semibold">{threshold} ಕಿ.ಮೀ.</span> ಒಳಗೆ ಯಾವುದೇ ಕಾನೂನು ನೆರವು ಕೇಂದ್ರವಿಲ್ಲ.</>
                  }
                </h1>

                {/* 2. Subtext (under 20 words, concrete, plain verbs) */}
                <p className="text-sm sm:text-base text-[var(--color-ink-secondary)] leading-relaxed max-w-xl">
                  {lang === 'en'
                    ? <>Affecting about <span className="font-mono text-[var(--color-ink-primary)] font-semibold">{formatPopulation(summary.people_beyond_threshold)}</span> citizens across Karnataka with potential gaps in statutory legal aid reach.</>
                    : <>ಕರ್ನಾಟಕದ ಸುಮಾರು <span className="font-mono text-[var(--color-ink-primary)] font-semibold">{formatPopulation(summary.people_beyond_threshold)}</span> ನಾಗರಿಕರಿಗೆ ಉಚಿತ ಸಾರ್ವಜನಿಕ ಕಾನೂನು ನೆರವು ಪ್ರವೇಶದಲ್ಲಿ ಸಂಭವನೀಯ ಅಂತರವಿದೆ.</>
                  }
                </p>

                {/* CTAs: 3. Primary "Find legal help", 4. Secondary "Explore the gaps" */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => navigateToView('workflows')}
                    className="px-5 py-3 rounded-lg text-sm font-semibold tracking-tight text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all active:scale-[0.98] shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <span>{lang === 'kn' ? 'ಕಾನೂನು ನೆರವು ಪಡೆಯಿರಿ' : 'Find legal help'}</span>
                    <CaretRight size={15} weight="bold" />
                  </button>

                  <button
                    onClick={() => navigateToView('explorer')}
                    className="px-5 py-3 rounded-lg text-sm font-medium tracking-tight text-[var(--color-ink-primary)] bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] border border-[var(--color-surface-2)] transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
                  >
                    <span>{lang === 'kn' ? 'ನಕ್ಷೆಯಲ್ಲಿ ಅಂತರ ನೋಡಿ' : 'Explore the gaps'}</span>
                    <ArrowSquareOut size={15} />
                  </button>
                </div>

                {/* Integrated Distance Instrument (quick thresholds + straight-line disclaimer) */}
                <div className="pt-4 border-t border-[var(--color-surface-2)]">
                  <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-ink-tertiary)] mb-2">
                    <span className="font-medium text-[var(--color-ink-secondary)]">{t('threshold', lang)}:</span>
                    <span className="font-mono">{threshold} km (approx. straight-line distance)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[10, 25, 50].map((tVal) => (
                      <button
                        key={tVal}
                        onClick={() => setThreshold(tVal)}
                        className="flex-1 py-1.5 rounded text-xs font-mono font-medium transition-all cursor-pointer border"
                        style={{
                          background: threshold === tVal ? 'var(--color-accent)' : 'var(--color-surface-1)',
                          color: threshold === tVal ? '#ffffff' : 'var(--color-ink-secondary)',
                          borderColor: threshold === tVal ? 'var(--color-accent)' : 'var(--color-surface-2)',
                        }}
                      >
                        {tVal} km
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Real Leaflet Map with signature straight-line path vectors */}
              <div className="lg:col-span-7 h-[360px] sm:h-[420px] lg:h-full min-h-[380px] rounded-xl overflow-hidden border border-[var(--color-surface-2)] shadow-sm relative bg-[var(--color-surface-1)]">
                <GapMap
                  centres={filteredCentres}
                  areas={filteredAreas}
                  selectedArea={selectedArea}
                  hoveredArea={hoveredArea}
                  whatIfMode={false}
                  whatIfPos={null}
                  onMapClick={handleMapClick}
                  onCentreClick={(c) => setSelectedCentre(c)}
                  onAreaHover={(id) => setHoveredArea(id)}
                  onAreaClick={(a) => {
                    setSelectedArea(a);
                    navigateToView('explorer');
                  }}
                  lang={lang}
                  threshold={threshold}
                  showPaths={true}
                />

                {/* Minimal Map Overlay Tag */}
                <div className="absolute bottom-3 left-3 z-[400] bg-[var(--color-surface-0)]/90 backdrop-blur-md px-2.5 py-1.5 rounded border border-[var(--color-surface-2)] text-[11px] text-[var(--color-ink-secondary)] pointer-events-none flex items-center gap-2 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-status-danger)] animate-pulse" />
                  <span>Dashed paths: approximate straight-line distance to nearest legal centre</span>
                </div>
              </div>

            </div>
          </section>

          {/* SECTION 2: THE FINDING (Asymmetric: One Large Number + Typographic List + Real Coverage Curve) */}
          <section className="w-full border-b border-[var(--color-surface-2)] bg-[var(--color-surface-0)] py-12 md:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                
                {/* Left Side: Big Number + Real Coverage Curve */}
                <div className="lg:col-span-5 space-y-8">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-accent)] font-mono">
                      Coverage Metric
                    </span>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="text-5xl sm:text-6xl font-bold font-mono text-[var(--color-ink-primary)] tracking-tight">
                        {summary.areas_beyond_threshold}
                      </span>
                      <span className="text-base text-[var(--color-ink-secondary)] font-medium">
                        / {areas.length} taluks isolated beyond {threshold} km
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-ink-secondary)] leading-relaxed max-w-md">
                      {Math.round((summary.areas_beyond_threshold / (areas.length || 1)) * 100)}% of Karnataka taluks face potential geographic blind spots under the current distance cutoff.
                    </p>
                  </div>

                  {/* Real Coverage Curve computed from actual taluk distance data */}
                  <div className="p-4 rounded-xl border border-[var(--color-surface-2)] bg-[var(--color-surface-1)]">
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="font-semibold text-[var(--color-ink-primary)]">Taluk Coverage by Distance</span>
                      <span className="font-mono text-[var(--color-accent)]">At {threshold}km: {100 - Math.round((summary.areas_beyond_threshold / (areas.length || 1)) * 100)}% covered</span>
                    </div>

                    {/* SVG Sparkline / Cumulative Coverage Curve */}
                    <div className="h-28 w-full">
                      <svg viewBox="0 0 320 90" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="320" y2="20" stroke="var(--color-surface-2)" strokeDasharray="3 3" />
                        <line x1="0" y1="50" x2="320" y2="50" stroke="var(--color-surface-2)" strokeDasharray="3 3" />
                        <line x1="0" y1="80" x2="320" y2="80" stroke="var(--color-surface-2)" strokeWidth="1" />

                        {/* Area fill */}
                        {coverageCurve.length > 1 && (
                          <polygon
                            points={`0,80 ${coverageCurve.map((c, i) => `${(i / (coverageCurve.length - 1)) * 320},${80 - (c.pct * 65) / 100}`).join(' ')} 320,80`}
                            fill="url(#coverageGradient)"
                          />
                        )}

                        {/* Line curve */}
                        {coverageCurve.length > 1 && (
                          <polyline
                            points={coverageCurve.map((c, i) => `${(i / (coverageCurve.length - 1)) * 320},${80 - (c.pct * 65) / 100}`).join(' ')}
                            fill="none"
                            stroke="var(--color-accent)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Curve points */}
                        {coverageCurve.map((c, i) => {
                          const cx = (i / (coverageCurve.length - 1)) * 320;
                          const cy = 80 - (c.pct * 65) / 100;
                          const isActive = threshold >= c.km && (i === coverageCurve.length - 1 || threshold < coverageCurve[i + 1].km);
                          return (
                            <g key={c.km}>
                              <circle
                                cx={cx}
                                cy={cy}
                                r={isActive ? 4.5 : 2.5}
                                fill={isActive ? 'var(--color-status-danger)' : 'var(--color-accent)'}
                                stroke="var(--color-surface-1)"
                                strokeWidth="1.5"
                              />
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    <div className="flex justify-between text-[11px] font-mono text-[var(--color-ink-tertiary)] mt-2">
                      <span>10 km</span>
                      <span>25 km</span>
                      <span>50 km</span>
                      <span>75+ km</span>
                    </div>
                  </div>

                  {/* Sample Banner if present */}
                  {hasSampleData && (
                    <div className="p-3 rounded-lg border border-[var(--color-sample-badge)]/30 bg-[var(--color-sample-badge-bg)] text-xs text-[var(--color-sample-badge)] flex items-start gap-2">
                      <Info size={16} className="shrink-0 mt-0.5" />
                      <span>Certain records are marked SAMPLE for ongoing research and require ground verification before field deployment.</span>
                    </div>
                  )}
                </div>

                {/* Right Side: Top 10 Underserved Areas as a Clean Typographic List (Not Cards) */}
                <div className="lg:col-span-7">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-surface-2)]">
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink-primary)]">
                      Top 10 Underserved Taluks
                    </h2>
                    <span className="text-xs text-[var(--color-ink-tertiary)] font-mono">
                      Hover to inspect path on map
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--color-surface-2)] text-[var(--color-ink-tertiary)] font-mono">
                          <th className="py-2.5 pr-2 font-medium w-8">#</th>
                          <th className="py-2.5 px-3 font-medium">Taluk</th>
                          <th className="py-2.5 px-3 font-medium hidden sm:table-cell">District</th>
                          <th className="py-2.5 px-3 font-medium text-right">Distance</th>
                          <th className="py-2.5 px-3 font-medium text-right hidden md:table-cell">Population</th>
                          <th className="py-2.5 pl-3 font-medium text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-surface-2)] font-sans">
                        {summary.top_underserved.map((area, i) => {
                          const isHovered = hoveredArea === area.id;
                          return (
                            <tr
                              key={area.id}
                              onMouseEnter={() => setHoveredArea(area.id)}
                              onMouseLeave={() => setHoveredArea(null)}
                              onClick={() => {
                                setSelectedArea(area);
                                navigateToView('explorer');
                              }}
                              className={`transition-colors cursor-pointer ${
                                isHovered ? 'bg-[var(--color-accent-subtle)]' : 'hover:bg-[var(--color-surface-1)]'
                              }`}
                            >
                              <td className="py-2.5 pr-2 font-mono text-[var(--color-ink-tertiary)]">
                                #{i + 1}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-[var(--color-ink-primary)]">
                                <span>{lang === 'kn' ? area.name_kn : area.name}</span>
                                {area.is_sample && (
                                  <span className="ml-1.5 px-1 py-0.5 rounded text-[10px] font-mono font-normal bg-[var(--color-sample-badge-bg)] text-[var(--color-sample-badge)] border border-[var(--color-sample-badge)]/20">
                                    SAMPLE
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[var(--color-ink-secondary)] hidden sm:table-cell">
                                {area.district}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium text-[var(--color-status-danger)]">
                                {formatDistance(area.nearest_km)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-[var(--color-ink-secondary)] hidden md:table-cell">
                                {formatPopulation(area.population)}
                              </td>
                              <td className="py-2.5 pl-3 text-right">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                                    area.gap_score >= 4
                                      ? 'bg-[#A31D1D]/15 text-[#A31D1D] dark:text-[#F87171]'
                                      : area.gap_score >= 3
                                      ? 'bg-[#C64E24]/15 text-[#C64E24] dark:text-[#FB923C]'
                                      : 'bg-[#D97E3A]/15 text-[#D97E3A] dark:text-[#FBBF24]'
                                  }`}
                                >
                                  {lang === 'kn' ? getGapLabelKn(area.gap_score) : getGapLabel(area.gap_score)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--color-surface-2)] flex items-center justify-between text-xs text-[var(--color-ink-tertiary)]">
                    <span>Distances are approximate straight-line calculations from centroid coordinates.</span>
                    <button
                      onClick={() => navigateToView('explorer')}
                      className="font-medium text-[var(--color-accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View all 176 taluks</span>
                      <CaretRight size={13} />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </section>

          {/* SECTION 3: THREE WAYS IN (Asymmetric Layout: "Find Help" Dominant, NOT 3 equal cards) */}
          <section className="w-full border-b border-[var(--color-surface-2)] bg-[var(--color-surface-1)] py-12 md:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                
                {/* Dominant Block: Find Legal Help (Takes 7 columns) */}
                <div className="lg:col-span-7 p-6 sm:p-8 rounded-xl bg-[var(--color-surface-0)] border border-[var(--color-surface-2)] flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-accent)] font-semibold">
                      Citizen Access
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-ink-primary)] mt-1.5">
                      Find help for your legal situation
                    </h2>
                    <p className="text-sm text-[var(--color-ink-secondary)] mt-2 leading-relaxed">
                      Guided step by step procedures under Karnataka and Indian civic statutes. Free legal aid eligibility checklists, filing steps, and nearest forum directions.
                    </p>

                    {/* Quick issue jump items */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { title: 'Free Legal Aid (Section 12 LSAA)', desc: 'DLSA / TLSC clinic representation' },
                        { title: 'Tenancy Deposit Recovery', desc: 'Urban tenant deposit disputes' },
                        { title: 'Consumer Protection Complaint', desc: 'Deficient goods and service refunds' },
                        { title: 'Unpaid Wages Claim', desc: 'Payment of Wages Act procedures' },
                        { title: 'RTI Request & First Appeal', desc: 'Public records and information access' },
                      ].map((item) => (
                        <button
                          key={item.title}
                          onClick={() => navigateToView('workflows')}
                          className="text-left p-3 rounded-lg border border-[var(--color-surface-2)] bg-[var(--color-surface-1)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-all cursor-pointer group"
                        >
                          <div className="font-medium text-xs text-[var(--color-ink-primary)] group-hover:text-[var(--color-accent)] flex items-center justify-between">
                            <span>{item.title}</span>
                            <CaretRight size={12} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                          <div className="text-[11px] text-[var(--color-ink-tertiary)] mt-0.5 truncate">
                            {item.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-[var(--color-surface-2)] flex items-center justify-between">
                    <span className="text-xs text-[var(--color-ink-tertiary)] font-mono">
                      Bilingual EN / KN checklists
                    </span>
                    <button
                      onClick={() => navigateToView('workflows')}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all active:scale-[0.98] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Start guided workflow</span>
                      <CaretRight size={14} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Secondary Column: Two Distinct Complementary Panels (5 columns) */}
                <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
                  
                  {/* Secondary 1: Explore Spatial Gaps */}
                  <div className="p-6 rounded-xl bg-[var(--color-surface-0)] border border-[var(--color-surface-2)] flex-1 flex flex-col justify-between shadow-sm">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-tertiary)] font-semibold">
                        Spatial Analysis
                      </span>
                      <h3 className="text-lg font-semibold text-[var(--color-ink-primary)] mt-1">
                        Explore coverage gaps
                      </h3>
                      <p className="text-xs text-[var(--color-ink-secondary)] mt-1.5 leading-relaxed">
                        Examine 176 taluks, inspect legal aid centres, and simulate placement of new facilities with live unserved population calculations.
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[var(--color-surface-2)] flex items-center justify-between">
                      <span className="text-xs font-mono text-[var(--color-ink-tertiary)]">176 taluks mapped</span>
                      <button
                        onClick={() => navigateToView('explorer')}
                        className="text-xs font-medium text-[var(--color-ink-primary)] hover:text-[var(--color-accent)] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open map explorer</span>
                        <CaretRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Secondary 2: Track a Case */}
                  <div className="p-6 rounded-xl bg-[var(--color-surface-0)] border border-[var(--color-surface-2)] flex-1 flex flex-col justify-between shadow-sm">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-tertiary)] font-semibold">
                        Confidential Workspace
                      </span>
                      <h3 className="text-lg font-semibold text-[var(--color-ink-primary)] mt-1">
                        Track a case
                      </h3>
                      <p className="text-xs text-[var(--color-ink-secondary)] mt-1.5 leading-relaxed">
                        Log hearing dates, track reply deadlines, and export RFC 5545 calendar invitations with Row Level Security.
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[var(--color-surface-2)] flex items-center justify-between">
                      <span className="text-xs font-mono text-[var(--color-ink-tertiary)]">Zero third-party trackers</span>
                      <button
                        onClick={() => navigateToView('cases')}
                        className="text-xs font-medium text-[var(--color-ink-primary)] hover:text-[var(--color-accent)] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open case tracker</span>
                        <CaretRight size={13} />
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </section>

          {/* SECTION 4: HOW THE NUMBERS ARE MADE (Methodology & Data Rigor Grid) */}
          <section className="w-full border-b border-[var(--color-surface-2)] bg-[var(--color-surface-0)] py-12 md:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              <div className="max-w-2xl mb-8">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-accent)] font-semibold">
                  Methodology & Data Rigor
                </span>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink-primary)] mt-1">
                  How the numbers are made
                </h2>
                <p className="text-sm text-[var(--color-ink-secondary)] mt-2 leading-relaxed">
                  Calculations use Euclidean straight-line distance from administrative taluk centroid coordinates to registered District Legal Services Authorities (DLSA) and Taluk Legal Services Committees (TLSC).
                </p>
              </div>

              {/* Data Verification Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Metric Card 1 */}
                <div className="p-5 rounded-xl border border-[var(--color-surface-2)] bg-[var(--color-surface-1)]">
                  <div className="text-xs font-mono text-[var(--color-ink-tertiary)] uppercase">
                    Facility Records
                  </div>
                  <div className="text-2xl font-bold font-mono text-[var(--color-ink-primary)] mt-2">
                    {methodologyMetrics.verifiedCentres} <span className="text-xs font-normal text-[var(--color-ink-tertiary)]">verified</span>
                  </div>
                  <div className="text-xs text-[var(--color-ink-secondary)] mt-1">
                    {methodologyMetrics.sampleCentres} sample records marked for ongoing field confirmation.
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--color-surface-2)] text-[11px] font-mono text-[var(--color-ink-tertiary)]">
                    Total mapped: {filteredCentres.length} centres
                  </div>
                </div>

                {/* Metric Card 2 */}
                <div className="p-5 rounded-xl border border-[var(--color-surface-2)] bg-[var(--color-surface-1)]">
                  <div className="text-xs font-mono text-[var(--color-ink-tertiary)] uppercase">
                    Administrative Units
                  </div>
                  <div className="text-2xl font-bold font-mono text-[var(--color-ink-primary)] mt-2">
                    {methodologyMetrics.verifiedAreas} <span className="text-xs font-normal text-[var(--color-ink-tertiary)]">Census taluks</span>
                  </div>
                  <div className="text-xs text-[var(--color-ink-secondary)] mt-1">
                    Centroid coordinates derived from official Karnataka administrative boundaries.
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--color-surface-2)] text-[11px] font-mono text-[var(--color-ink-tertiary)]">
                    Population basis: Census 2011
                  </div>
                </div>

                {/* Metric Card 3 */}
                <div className="p-5 rounded-xl border border-[var(--color-surface-2)] bg-[var(--color-surface-1)]">
                  <div className="text-xs font-mono text-[var(--color-ink-tertiary)] uppercase">
                    Verification Audit
                  </div>
                  <div className="text-2xl font-bold font-mono text-[var(--color-ink-primary)] mt-2">
                    {methodologyMetrics.latestVerified}
                  </div>
                  <div className="text-xs text-[var(--color-ink-secondary)] mt-1">
                    Oldest unverified sample node in registry dates to {methodologyMetrics.oldestVerified}.
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--color-surface-2)] text-[11px] font-mono text-[var(--color-ink-tertiary)]">
                    Review cycle: Quarterly audit
                  </div>
                </div>

              </div>

              {/* Methodology Technical Caveats */}
              <div className="mt-6 p-4 rounded-xl border border-[var(--color-surface-2)] bg-[var(--color-surface-1)] text-xs text-[var(--color-ink-secondary)] leading-relaxed space-y-1.5">
                <div className="font-semibold text-[var(--color-ink-primary)]">Technical Caveats:</div>
                <p>1. Straight-line distances represent geometric proximity and do not account for road network routes, ghat terrains, or transit frequency.</p>
                <p>2. "Potential gap" denotes geographic isolation from mapped statutory centres. It does not certify that no legal clinic, pro bono advocate, or Lok Adalat bench ever visits the area.</p>
              </div>

            </div>
          </section>

          {/* SECTION 5: MINIMAL REAL FOOTER */}
          <footer className="w-full bg-[var(--color-surface-1)] border-t border-[var(--color-surface-2)] py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[var(--color-surface-2)]">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-base tracking-tight text-[var(--color-ink-primary)]">
                      Nyaya<span className="text-[var(--color-accent)] font-normal mx-[1px]">-</span>Maarg
                    </span>
                    <span className="text-xs text-[var(--color-ink-tertiary)] font-mono pl-2 border-l border-[var(--color-surface-2)]">
                      {t('app_subtitle', lang)}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-ink-secondary)] mt-1.5 max-w-md">
                    Independent civic data publication. Not a government agency or official legal services authority.
                  </div>
                </div>

                {/* Real nav links */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[var(--color-ink-secondary)]">
                  <button onClick={() => navigateToView('overview')} className="hover:text-[var(--color-accent)] cursor-pointer">
                    {t('overview', lang)}
                  </button>
                  <button onClick={() => navigateToView('explorer')} className="hover:text-[var(--color-accent)] cursor-pointer">
                    {t('explorer', lang)}
                  </button>
                  <button onClick={() => navigateToView('workflows')} className="hover:text-[var(--color-accent)] cursor-pointer">
                    {t('workflows', lang)}
                  </button>
                  <button onClick={() => navigateToView('cases')} className="hover:text-[var(--color-accent)] cursor-pointer">
                    {t('cases', lang)}
                  </button>
                  <button onClick={() => navigateToView('interpreter')} className="hover:text-[var(--color-accent)] cursor-pointer">
                    {t('interpreter', lang)}
                  </button>
                  <button onClick={() => navigateToView('navigator')} className="hover:text-[var(--color-accent)] cursor-pointer">
                    {t('navigator', lang)}
                  </button>
                </div>
              </div>

              {/* Bottom bar with Kannada script */}
              <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--color-ink-tertiary)]">
                <div className="flex items-center gap-2">
                  <span className="font-kannada text-sm text-[var(--color-ink-secondary)]">ನ್ಯಾಯ ಮಾರ್ಗ</span>
                  <span className="text-[11px] font-mono text-[var(--color-ink-tertiary)]">
                    [Draft: to be confirmed with a native Kannada speaker]
                  </span>
                </div>
                <div className="text-[11px] font-mono">
                  NALSA Helpline: 15100 • Emergency: 112
                </div>
              </div>

            </div>
          </footer>
        </div>
      )}

      {/* ===== EXPLORER VIEW ===== */}
      {view === 'explorer' && (
        <div className="flex flex-col md:flex-row h-[calc(100vh-60px)] md:h-[calc(100vh-68px)]">
          {/* Side panel */}
          <div
            className={`no-print ${showMobileList ? 'fixed inset-0 z-40 pt-16' : 'hidden'} md:relative md:block md:w-[380px] lg:w-[420px] overflow-y-auto border-r flex-shrink-0`}
            style={{ background: 'var(--color-surface-0)', borderColor: 'var(--color-surface-2)' }}
          >
            {/* Mobile close */}
            <button
              className="md:hidden absolute top-4 right-4 p-2 rounded-md z-50"
              style={{ background: 'var(--color-surface-1)' }}
              onClick={() => setShowMobileList(false)}
              aria-label={t('close', lang)}
            >
              <X size={20} />
            </button>

            <div className="p-4 space-y-4">
              {/* Filters */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Funnel size={18} style={{ color: 'var(--color-ink-tertiary)' }} />
                  <span className="font-label" style={{ color: 'var(--color-ink-secondary)' }}>
                    {lang === 'kn' ? 'ಫಿಲ್ಟರ್‌ಗಳು' : 'Filters'}
                  </span>
                </div>

                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-primary)', border: '1px solid var(--color-surface-2)', fontFamily: 'var(--font-sans)' }}
                  aria-label={t('filter_district', lang)}
                >
                  <option value="">{t('all_districts', lang)}</option>
                  {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-primary)', border: '1px solid var(--color-surface-2)', fontFamily: 'var(--font-sans)' }}
                  aria-label={t('filter_type', lang)}
                >
                  <option value="">{t('all_types', lang)}</option>
                  {centreTypes.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                </select>

                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-primary)', border: '1px solid var(--color-surface-2)', fontFamily: 'var(--font-sans)' }}
                  aria-label={t('services', lang)}
                >
                  <option value="">{lang === 'kn' ? 'ಎಲ್ಲಾ ಸೇವೆಗಳು' : 'All services'}</option>
                  {serviceTypes.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>

                {/* Threshold slider */}
                <div>
                  <label className="font-label mb-1 block text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                    {t('threshold', lang)}: <span className="font-stat" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{threshold} km</span>
                  </label>
                  <input
                    type="range" min={10} max={50} step={5} value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full"
                    aria-label={t('threshold', lang)}
                  />
                </div>
              </div>

              {/* What-if toggle */}
              <button
                onClick={() => { setWhatIfMode(!whatIfMode); setWhatIfPos(null); }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: whatIfMode ? 'var(--color-accent-subtle)' : 'var(--color-surface-1)',
                  color: whatIfMode ? 'var(--color-accent)' : 'var(--color-ink-secondary)',
                  border: `1px solid ${whatIfMode ? 'var(--color-accent)' : 'var(--color-surface-2)'}`,
                }}
              >
                <Crosshair size={18} />
                {whatIfMode ? t('disable_what_if', lang) : t('enable_what_if', lang)}
              </button>

              {/* What-if result */}
              {whatIfMode && whatIfResult && (
                <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent)' }}>
                  <p className="font-body-sm" style={{ color: 'var(--color-accent)' }}>
                    {whatIfResult.newlyServed.length > 0
                      ? t('what_if_result', lang, {
                          count: whatIfResult.newlyServed.length,
                          population: formatPopulation(whatIfResult.peopleBenefit),
                          threshold: threshold,
                        })
                      : t('what_if_no_impact', lang)
                    }
                  </p>
                  {whatIfResult.newlyServed.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {whatIfResult.newlyServed.slice(0, 5).map((a) => (
                        <li key={a.id} className="font-body-sm" style={{ color: 'var(--color-ink-secondary)' }}>
                          • {lang === 'kn' ? a.name_kn : a.name} ({formatPopulation(a.population)})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Briefing export */}
              <button
                onClick={handlePrint}
                className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-secondary)', border: '1px solid var(--color-surface-2)' }}
              >
                <Printer size={18} />
                {t('briefing_export', lang)}
              </button>

              {/* Top underserved list */}
              <div>
                <h3 className="font-h3 mb-3">{t('top_underserved', lang)}</h3>
                <div className="space-y-2">
                  {summary.top_underserved
                    .filter((a) => !selectedDistrict || a.district === selectedDistrict)
                    .slice(0, 10)
                    .map((area, i) => (
                    <button
                      key={area.id}
                      className="w-full text-left p-3 rounded-lg transition-all"
                      style={{
                        background: (hoveredArea === area.id || selectedArea?.id === area.id) ? 'var(--color-accent-subtle)' : 'var(--color-surface-1)',
                        border: `1px solid ${selectedArea?.id === area.id ? 'var(--color-accent)' : 'var(--color-surface-2)'}`,
                      }}
                      onMouseEnter={() => setHoveredArea(area.id)}
                      onMouseLeave={() => setHoveredArea(null)}
                      onClick={() => setSelectedArea(area)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-stat text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-tertiary)' }}>
                              #{i + 1}
                            </span>
                            <span className="font-body font-medium truncate">
                              {lang === 'kn' ? area.name_kn : area.name}
                            </span>
                            {area.is_sample && <span className="sample-badge" style={{ fontSize: '0.5625rem' }}>{t('sample', lang)}</span>}
                          </div>
                          <p className="font-body-sm mt-0.5" style={{ color: 'var(--color-ink-secondary)' }}>
                            {area.district} · {formatPopulation(area.population)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-stat text-sm block" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-status-danger)' }}>
                            {formatDistance(area.nearest_km)}
                          </span>
                          <span className={`gap-score-${area.gap_score} px-1.5 py-0.5 rounded text-xs font-semibold inline-block mt-1`}>
                            {lang === 'kn' ? getGapLabelKn(area.gap_score) : getGapLabel(area.gap_score)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Map area */}
          <div className="flex-1 relative">
            <GapMap
              centres={filteredCentres}
              areas={filteredAreas}
              selectedArea={selectedArea}
              hoveredArea={hoveredArea}
              whatIfMode={whatIfMode}
              whatIfPos={whatIfPos}
              onMapClick={handleMapClick}
              onCentreClick={setSelectedCentre}
              onAreaHover={setHoveredArea}
              onAreaClick={setSelectedArea}
              lang={lang}
              threshold={threshold}
            />

            {/* Mobile toggle */}
            <button
              className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full font-medium text-sm glass"
              style={{ boxShadow: 'var(--shadow-lg)' }}
              onClick={() => setShowMobileList(!showMobileList)}
              aria-label={showMobileList ? t('map_view', lang) : t('list_view', lang)}
            >
              {showMobileList ? (
                <><MapTrifold size={18} className="inline mr-2" />{t('map_view', lang)}</>
              ) : (
                <><ListIcon size={18} className="inline mr-2" />{t('list_view', lang)}</>
              )}
            </button>

            {/* What-if indicator */}
            {whatIfMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full glass font-body-sm" style={{ color: 'var(--color-accent)' }}>
                <Crosshair size={16} className="inline mr-2" />
                {t('what_if_desc', lang)}
              </div>
            )}
          </div>

          {/* Centre detail drawer */}
          {selectedCentre && (
            <div
              className="fixed inset-y-0 right-0 w-full sm:w-[400px] z-50 overflow-y-auto"
              style={{ background: 'var(--color-surface-0)', boxShadow: 'var(--shadow-xl)' }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-h2">{lang === 'kn' ? selectedCentre.name_kn : selectedCentre.name}</h2>
                      {selectedCentre.is_sample && <span className="sample-badge">{t('sample', lang)}</span>}
                    </div>
                    <span className="font-label px-2 py-1 rounded" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', fontSize: '0.6875rem' }}>
                      {selectedCentre.type}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedCentre(null)}
                    className="p-2 rounded-md transition-colors"
                    style={{ background: 'var(--color-surface-1)' }}
                    aria-label={t('close', lang)}
                  >
                    <X size={20} />
                  </button>
                </div>

                {selectedCentre.is_sample && (
                  <div className="flex items-start gap-2 p-3 rounded-lg mb-4" style={{ background: 'var(--color-sample-badge-bg)', border: '1px solid var(--color-sample-badge)' }}>
                    <Warning size={16} style={{ color: 'var(--color-sample-badge)', flexShrink: 0, marginTop: 2 }} />
                    <p className="font-body-sm" style={{ color: 'var(--color-sample-badge)' }}>
                      {t('sample_explanation', lang)}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mb-6">
                  <a
                    href={getGoogleMapsUrl(selectedCentre.lat, selectedCentre.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors"
                    style={{ background: 'var(--color-accent)', color: '#fff' }}
                  >
                    <ArrowSquareOut size={18} />
                    {t('open_in_maps', lang)}
                  </a>
                  {selectedCentre.phone && (
                    <a
                      href={getPhoneUrl(selectedCentre.phone)}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors"
                      style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-primary)', border: '1px solid var(--color-surface-2)' }}
                    >
                      <Phone size={18} />
                      {t('call', lang)}
                    </a>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <p className="font-label mb-1" style={{ color: 'var(--color-ink-tertiary)' }}>{t('address', lang)}</p>
                    <p className="font-body" style={{ color: 'var(--color-ink-primary)' }}>{selectedCentre.address}</p>
                  </div>

                  {selectedCentre.phone && (
                    <div>
                      <p className="font-label mb-1" style={{ color: 'var(--color-ink-tertiary)' }}>{t('call', lang)}</p>
                      <p className="font-body font-stat" style={{ fontFamily: 'var(--font-mono)' }}>{selectedCentre.phone}</p>
                    </div>
                  )}

                  <div>
                    <p className="font-label mb-2" style={{ color: 'var(--color-ink-tertiary)' }}>{t('services', lang)}</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCentre.services.map((s) => (
                        <span key={s} className="px-2 py-1 rounded-md text-xs font-medium" style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-secondary)' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="font-label mb-2" style={{ color: 'var(--color-ink-tertiary)' }}>{t('languages', lang)}</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCentre.languages.map((l) => (
                        <span key={l} className="px-2 py-1 rounded-md text-xs font-medium" style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-secondary)' }}>
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4" style={{ borderTop: '1px solid var(--color-surface-2)' }}>
                    <p className="font-label mb-1" style={{ color: 'var(--color-ink-tertiary)' }}>{t('source', lang)}</p>
                    <a href={selectedCentre.source_url} target="_blank" rel="noopener noreferrer" className="font-body-sm" style={{ color: 'var(--color-accent)' }}>
                      {selectedCentre.source_url}
                    </a>
                    <p className="font-body-sm mt-2" style={{ color: 'var(--color-ink-tertiary)' }}>
                      {t('last_verified', lang)}: {selectedCentre.last_verified}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selected area detail (bottom sheet on mobile) */}
          {selectedArea && !selectedCentre && (
            <div
              className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-4 md:right-4 md:left-auto md:w-[360px] z-30 rounded-t-2xl md:rounded-xl overflow-hidden"
              style={{ background: 'var(--color-surface-0)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-surface-2)' }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-h3">{lang === 'kn' ? selectedArea.name_kn : selectedArea.name}</h3>
                    <p className="font-body-sm" style={{ color: 'var(--color-ink-secondary)' }}>
                      {selectedArea.district}
                    </p>
                  </div>
                  <button onClick={() => setSelectedArea(null)} className="p-1.5 rounded-md" style={{ background: 'var(--color-surface-1)' }} aria-label={t('close', lang)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="font-label text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>{t('population', lang)}</p>
                    <p className="font-stat text-sm" style={{ fontFamily: 'var(--font-mono)' }}>{formatPopulation(selectedArea.population)}</p>
                  </div>
                  <div>
                    <p className="font-label text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>{t('approx_distance', lang)}</p>
                    <p className="font-stat text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-status-danger)' }}>{formatDistance(selectedArea.nearest_km)}</p>
                  </div>
                  <div>
                    <p className="font-label text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>{t('gap_score', lang)}</p>
                    <span className={`gap-score-${selectedArea.gap_score} px-2 py-0.5 rounded text-xs font-semibold`}>
                      {lang === 'kn' ? getGapLabelKn(selectedArea.gap_score) : getGapLabel(selectedArea.gap_score)}
                    </span>
                  </div>
                </div>
                <p className="font-body-sm" style={{ color: 'var(--color-ink-tertiary)' }}>
                  {t('nearest_centre', lang)}: {selectedArea.nearest_centre_name}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== NAVIGATOR VIEW ===== */}
      {view === 'navigator' && (
        <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
          <div className="mb-8">
            <h2 className="font-h1 mb-2">{t('navigator', lang)}</h2>
            <p className="font-body" style={{ color: 'var(--color-ink-secondary)' }}>
              {lang === 'kn'
                ? 'ನಿಮ್ಮ ಪರಿಸ್ಥಿತಿಯ ಬಗ್ಗೆ ಕೆಲವು ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ, ಮತ್ತು ನಾವು ಸಂಬಂಧಿತ ಸಂಪನ್ಮೂಲಗಳನ್ನು ಸೂಚಿಸುತ್ತೇವೆ.'
                : 'Answer a few questions about your situation, and we\'ll suggest relevant legal aid resources.'
              }
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {navigatorQuestions.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full transition-all"
                style={{
                  background: i < navStep ? 'var(--color-accent)' : i === navStep ? 'var(--color-accent-subtle)' : 'var(--color-surface-2)',
                }}
              />
            ))}
          </div>

          {/* Question */}
          {navStep < navigatorQuestions.length && (
            <div>
              <p className="font-label mb-1" style={{ color: 'var(--color-ink-tertiary)' }}>
                {lang === 'kn' ? `ಪ್ರಶ್ನೆ ${navStep + 1} / ${navigatorQuestions.length}` : `Question ${navStep + 1} of ${navigatorQuestions.length}`}
              </p>
              <h3 className="font-h2 mb-6">{navigatorQuestions[navStep].label}</h3>
              <div className="space-y-3">
                {navigatorQuestions[navStep].options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setNavAnswers({ ...navAnswers, [navigatorQuestions[navStep].key]: opt.value });
                      setNavStep(navStep + 1);
                    }}
                    className="w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all"
                    style={{
                      background: navAnswers[navigatorQuestions[navStep].key] === opt.value ? 'var(--color-accent-subtle)' : 'var(--color-surface-1)',
                      border: `1px solid ${navAnswers[navigatorQuestions[navStep].key] === opt.value ? 'var(--color-accent)' : 'var(--color-surface-2)'}`,
                    }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ border: '2px solid var(--color-ink-tertiary)' }}>
                      {navAnswers[navigatorQuestions[navStep].key] === opt.value && (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
                      )}
                    </div>
                    <span className="font-body">{opt.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-6">
                {navStep > 0 && (
                  <button
                    onClick={() => setNavStep(navStep - 1)}
                    className="px-4 py-2 rounded-lg font-medium text-sm"
                    style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-secondary)' }}
                  >
                    <CaretLeft size={16} className="inline mr-1" /> {t('nav_previous', lang)}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {navStep >= navigatorQuestions.length && navigatorResults && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle size={28} style={{ color: 'var(--color-status-success)' }} />
                <h3 className="font-h2">{t('nav_result_title', lang)}</h3>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-3 p-4 rounded-xl mb-6" style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent)' }}>
                <Info size={18} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
                <p className="font-body-sm" style={{ color: 'var(--color-accent)' }}>
                  {t('nav_disclaimer', lang)}
                </p>
              </div>

              {/* Helpline */}
              <div className="p-4 rounded-xl mb-6 flex items-center gap-4" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-surface-2)' }}>
                <Phone size={24} style={{ color: 'var(--color-accent)' }} />
                <div>
                  <p className="font-label" style={{ color: 'var(--color-ink-secondary)' }}>{t('helpline', lang)}</p>
                  <a href="tel:15100" className="font-stat text-xl" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
                    {t('helpline_number', lang)}
                  </a>
                </div>
              </div>

              {/* Official Resources */}
              <div className="mb-6">
                <h4 className="font-h3 mb-3">{t('nav_result_resources', lang)}</h4>
                <div className="space-y-3">
                  {navigatorResults.resources.map((r, i) => (
                    <a
                      key={i}
                      href={r.url}
                      target={r.url.startsWith('tel:') ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      className="block p-4 rounded-xl transition-colors"
                      style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-surface-2)' }}
                    >
                      <p className="font-body font-medium mb-1" style={{ color: 'var(--color-ink-primary)' }}>
                        {lang === 'kn' ? r.name_kn : r.name}
                      </p>
                      <p className="font-body-sm" style={{ color: 'var(--color-ink-secondary)' }}>
                        {lang === 'kn' ? r.description_kn : r.description}
                      </p>
                    </a>
                  ))}
                </div>
              </div>

              {/* Relevant Centres */}
              <div className="mb-6">
                <h4 className="font-h3 mb-3">{t('nav_result_centres', lang)}</h4>
                <div className="space-y-3">
                  {navigatorResults.centres.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl"
                      style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-surface-2)' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-body font-medium">{lang === 'kn' ? c.name_kn : c.name}</p>
                          <span className="font-label text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
                            {c.type}
                          </span>
                        </div>
                        {c.is_sample && <span className="sample-badge">{t('sample', lang)}</span>}
                      </div>
                      <p className="font-body-sm mb-3" style={{ color: 'var(--color-ink-secondary)' }}>{c.address}</p>
                      <div className="flex gap-2">
                        <a
                          href={getGoogleMapsUrl(c.lat, c.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
                          style={{ background: 'var(--color-accent)', color: '#fff' }}
                        >
                          <ArrowSquareOut size={14} /> {t('open_in_maps', lang)}
                        </a>
                        {c.phone && (
                          <a
                            href={getPhoneUrl(c.phone)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
                            style={{ background: 'var(--color-surface-2)', color: 'var(--color-ink-primary)' }}
                          >
                            <Phone size={14} /> {c.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist */}
              <div className="mb-6">
                <h4 className="font-h3 mb-3">{t('nav_checklist', lang)}</h4>
                <div className="space-y-2">
                  {navigatorResults.checklist.map((item, i) => (
                    <label key={i} className="flex items-start gap-3 p-3 rounded-lg cursor-pointer" style={{ background: 'var(--color-surface-1)' }}>
                      <input type="checkbox" className="mt-1 accent-[var(--color-accent)] w-4 h-4" />
                      <span className="font-body-sm">{lang === 'kn' ? item.item_kn : item.item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Restart */}
              <button
                onClick={() => {
                  setNavStep(0);
                  setNavAnswers({ issue_type: null, urgency: null, affected_party: null, income_category: null, language_pref: null });
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm"
                style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-secondary)', border: '1px solid var(--color-surface-2)' }}
              >
                <ArrowsCounterClockwise size={18} /> {t('nav_restart', lang)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== INSIGHTS VIEW ===== */}
      {view === 'insights' && (
        <InsightsView
          areasWithGap={filteredAreas}
          allAreas={areas}
          centres={filteredCentres}
          threshold={threshold}
          selectedDistrict={selectedDistrict}
          selectedService={selectedService}
          districts={districts}
          serviceTypes={serviceTypes}
          onThresholdChange={setThreshold}
          onDistrictChange={setSelectedDistrict}
          onServiceChange={setSelectedService}
          onJumpToMap={(dist) => {
            if (dist) setSelectedDistrict(dist);
            setView('explorer');
          }}
          lang={lang}
        />
      )}

      {/* ===== WORKFLOWS VIEW ===== */}
      {view === 'workflows' && (
        <WorkflowsView
          lang={lang}
          centres={centres}
          onTrackCase={(workflowId, title, forum) => {
            setPrefillWorkflow({ workflowId, title, forum });
            navigateToView('cases');
          }}
          onAskAssistant={(prompt) => {
            setAssistantInitialPrompt(prompt);
            setAssistantOpen(true);
          }}
        />
      )}

      {/* ===== CASE TRACKER VIEW ===== */}
      {view === 'cases' && (
        <CaseTrackerView
          userId={user?.id || (isGuest ? 'demo_user' : 'guest')}
          lang={lang}
          onNavigateToWorkflows={() => navigateToView('workflows')}
          prefillWorkflow={prefillWorkflow}
          onClearPrefill={() => setPrefillWorkflow(null)}
        />
      )}

      {/* ===== CASE INTERPRETER VIEW ===== */}
      {view === 'interpreter' && (
        <CaseInterpreterView
          userId={user?.id || (isGuest ? 'demo_user' : 'guest')}
          lang={lang}
          onNavigateToWorkflow={(_wfId) => navigateToView('workflows')}
          onNavigateToCases={() => navigateToView('cases')}
        />
      )}

      {/* ===== AUTH VIEW ===== */}
      {(view === 'login' || view === 'signup') && (
        <div className="px-4 py-8">
          <AuthView
            initialMode={view === 'signup' ? 'signup' : 'login'}
            lang={lang}
            onSuccess={handleAuthSuccess}
            onCancel={() => setView('overview')}
            stats={{
              totalTaluks: areas.length,
              gapsCount: summary.areas_beyond_threshold,
              peopleAffected: formatPopulation(summary.people_beyond_threshold),
            }}
          />
        </div>
      )}

      {/* ===== AI ASSISTANT DRAWER ===== */}
      <AIAssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        lang={lang}
        centres={centres}
        initialPrompt={assistantInitialPrompt}
        onClearInitialPrompt={() => setAssistantInitialPrompt(null)}
        userCases={userCases}
        onSelectCentre={(centreId) => {
          const found = centres.find((c) => c.id === centreId);
          if (found) setSelectedCentre(found);
        }}
        onApplyFilter={(dist, th) => {
          if (dist !== undefined) setSelectedDistrict(dist);
          if (th !== undefined) setThreshold(th);
        }}
        onNavigateTab={(tab) => navigateToView(tab)}
      />

      {/* ===== PRINT BRIEFING ===== */}
      <div className="print-only p-8">
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>{t('briefing_title', lang)}</h1>
        <p className="text-sm text-gray-600 mb-6">{t('briefing_subtitle', lang)}</p>
        <p className="text-lg mb-4">
          {summary.areas_beyond_threshold} taluks have no mapped centre within {threshold} km, affecting ~{formatPopulation(summary.people_beyond_threshold)} people.
        </p>
        <h2 className="text-lg font-bold mb-2 mt-6">Top 5 Underserved Areas (Suggested Camp Locations)</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 text-left">Rank</th>
              <th className="border p-2 text-left">Taluk</th>
              <th className="border p-2 text-left">District</th>
              <th className="border p-2 text-right">Population</th>
              <th className="border p-2 text-right">Distance to nearest centre</th>
            </tr>
          </thead>
          <tbody>
            {summary.top_underserved.slice(0, 5).map((a, i) => (
              <tr key={a.id}>
                <td className="border p-2">#{i + 1}</td>
                <td className="border p-2">{a.name}</td>
                <td className="border p-2">{a.district}</td>
                <td className="border p-2 text-right">{formatPopulation(a.population)}</td>
                <td className="border p-2 text-right">{formatDistance(a.nearest_km)} (approx.)</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-4">
          Distances are approximate straight-line distances from taluk centroids. Source: NALSA, Census 2011. Potential gaps need ground verification.
        </p>
      </div>
    </div>
  );
}

export default App;
