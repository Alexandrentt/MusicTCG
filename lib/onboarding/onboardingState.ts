import { v4 as uuidv4 } from 'uuid';
export const generateUUID = uuidv4;

export interface OnboardingState {
    completed: boolean;
    currentPhase: 'welcome' | 'booster_1' | 'battle' | 'booster_2' | 'grinding' | 'crafting' | 'discovery' | 'save_cloud' | 'done';
    guestId: string;
    startedAt: string;
    completedAt?: string;
}

const ONBOARDING_KEY = 'onboarding_state';

const PHASES: OnboardingState['currentPhase'][] = [
    'welcome',
    'booster_1',
    'battle',
    'booster_2',
    'grinding',
    'crafting',
    'discovery',
    'save_cloud',
    'done'
];

export function getOnboardingState(): OnboardingState {
    if (typeof window === 'undefined') {
        return {
            completed: false,
            currentPhase: 'welcome',
            guestId: '',
            startedAt: new Date().toISOString(),
        };
    }

    const stored = localStorage.getItem(ONBOARDING_KEY);

    if (!stored) {
        const state: OnboardingState = {
            completed: false,
            currentPhase: 'welcome',
            guestId: generateUUID(),
            startedAt: new Date().toISOString(),
        };
        localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
        return state;
    }

    return JSON.parse(stored);
}

export function getNextPhase(currentPhase: OnboardingState['currentPhase']): OnboardingState['currentPhase'] {
    const currentIndex = PHASES.indexOf(currentPhase);
    if (currentIndex === -1 || currentIndex === PHASES.length - 1) return 'done';
    return PHASES[currentIndex + 1];
}

export function markPhaseComplete(phase: OnboardingState['currentPhase']) {
    if (typeof window === 'undefined') return;

    const state = getOnboardingState();
    const nextPhase = getNextPhase(phase);
    state.currentPhase = nextPhase;

    if (nextPhase === 'done') {
        state.completed = true;
        state.completedAt = new Date().toISOString();
    }

    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
}

export function resetOnboarding() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ONBOARDING_KEY);
}
