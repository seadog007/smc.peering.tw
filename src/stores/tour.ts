import { create } from "zustand";

type StartTourFn = () => void;

interface TourStoreState {
  startTour: StartTourFn;
  setStartTour: (fn: StartTourFn) => void;
}

export const useTourStore = create<TourStoreState>((set) => ({
  startTour: () => {},
  setStartTour: (fn) => set({ startTour: fn }),
}));

