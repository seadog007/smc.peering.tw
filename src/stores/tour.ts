import { create } from "zustand";

type StartTourFn = () => void;

interface TourStoreState {
  startTour: StartTourFn;
  setStartTour: (fn: StartTourFn) => void;
  tourActive: boolean;
  setTourActive: (active: boolean) => void;
  topologyTourOpen: boolean;
  setTopologyTourOpen: (open: boolean) => void;
}

export const useTourStore = create<TourStoreState>((set) => ({
  startTour: () => {},
  setStartTour: (fn) => set({ startTour: fn }),
  tourActive: false,
  setTourActive: (active) => set({ tourActive: active }),
  topologyTourOpen: false,
  setTopologyTourOpen: (open) => set({ topologyTourOpen: open }),
}));
