import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import MockTest from "./pages/MockTest";
import TestLibrary from "./pages/TestLibrary";
import TestHistory from "./pages/TestHistory";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import InterviewSetup from "./pages/InterviewSetup";
import InterviewRoom from "./pages/InterviewRoom";
import InterviewAnalysis from "./pages/InterviewAnalysis";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
import AdminSeeder from "@/pages/AdminSeeder";
import ForgotPassword from "@/pages/Forgotpassword";
import ResetPassword from "@/pages/Resetpassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* PUBLIC */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* PROTECTED - Regular Users */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/mock-test" element={
            <ProtectedRoute><MockTest /></ProtectedRoute>
          } />
          <Route path="/test-library" element={
            <ProtectedRoute><TestLibrary /></ProtectedRoute>
          } />
          <Route path="/test-history" element={
            <ProtectedRoute><TestHistory /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/pricing" element={
            <ProtectedRoute><Pricing /></ProtectedRoute>
          } />
          <Route path="/ai-interview" element={
            <ProtectedRoute><InterviewSetup /></ProtectedRoute>
          } />
          <Route path="/ai-interview/room" element={
            <ProtectedRoute><InterviewRoom /></ProtectedRoute>
          } />
          <Route path="/admin/seeder" element={
            <ProtectedRoute><AdminSeeder /></ProtectedRoute>
          } />
          <Route path="/forgot-password" element={
            <ProtectedRoute><ForgotPassword /></ProtectedRoute>
          } />
          <Route path="/reset-password" element={
            <ProtectedRoute><ResetPassword /></ProtectedRoute>
          } />
          <Route path="/ai-interview/analysis" element={
            <ProtectedRoute><InterviewAnalysis /></ProtectedRoute>
          } />

          {/* ADMIN DASHBOARD - Protected by AdminRoute */}
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

