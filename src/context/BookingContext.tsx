"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import BookingModal from "@/components/bookings/BookingModal";

interface BookingOptions {
  defaultDate?: string;
  onCreated?: () => void;
  editingGroup?: any;
}

interface BookingContextType {
  openBooking: (options?: BookingOptions) => void;
  closeBooking: () => void;
  isOpen: boolean;
}

const BookingContext = createContext<BookingContextType>({
  openBooking: () => {},
  closeBooking: () => {},
  isOpen: false,
});

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<BookingOptions | undefined>(undefined);

  const openBooking = (opts?: BookingOptions) => {
    setOptions(opts);
    setIsOpen(true);
  };

  const closeBooking = () => {
    setIsOpen(false);
  };

  return (
    <BookingContext.Provider value={{ isOpen, openBooking, closeBooking }}>
      {children}
      <BookingModal
        open={isOpen}
        onClose={closeBooking}
        defaultDate={options?.defaultDate}
        onCreated={options?.onCreated}
        editingGroup={options?.editingGroup}
      />
    </BookingContext.Provider>
  );
}

export const useBooking = () => useContext(BookingContext);
