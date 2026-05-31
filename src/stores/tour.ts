import { create } from "zustand";

type StartTourFn = () => void;

interface TourStoreState {
  startTour: StartTourFn;
  setStartTour: (fn: StartTourFn) => void;
  topologyTourOpen: boolean;
  setTopologyTourOpen: (open: boolean) => void;
}

export const useTourStore = create<TourStoreState>((set) => ({
  startTour: () => {},
  setStartTour: (fn) => set({ startTour: fn }),
  topologyTourOpen: false,
  setTopologyTourOpen: (open) => set({ topologyTourOpen: open }),
}));
