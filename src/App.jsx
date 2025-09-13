import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import BookingApp from "./components/BookingApp";
import ViewBookings from "./components/ViewBookings";
import Banner from "./components/Banner";
import Footer from "./components/Footer";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto p-4 md:p-6">
          <Banner />

          <header className="mb-6 flex items-center justify-between">
            <nav className="flex gap-2">
            </nav>
          </header>

          <section className="bg-white border rounded-2xl shadow-sm p-4 md:p-6">
            <Routes>
              <Route path="/" element={<BookingApp />} />
              <Route path="/view-bookings" element={<ViewBookings />} />
            </Routes>
          </section>

          <Footer />
        </main>
      </div>
    </BrowserRouter>
  );
}
