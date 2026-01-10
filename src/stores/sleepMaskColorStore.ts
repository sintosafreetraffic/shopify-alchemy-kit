import { create } from 'zustand';

interface SleepMaskColorState {
  selectedColor: string;
  setSelectedColor: (color: string) => void;
}

export const useSleepMaskColorStore = create<SleepMaskColorState>((set) => ({
  selectedColor: "",
  setSelectedColor: (color) => set({ selectedColor: color }),
}));
