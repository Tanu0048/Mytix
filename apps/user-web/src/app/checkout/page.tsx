"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, CreditCard, ShieldCheck, ChevronLeft, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const holdId = searchParams.get('holdId');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hold, setHold] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [attendees, setAttendees] = useState<{name: string, email: string}[]>([]);

  useEffect(() => {
    if (!holdId) {
      router.push('/');
      return;
    }

    async function fetchHold() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/holds/${holdId}`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || data.message || 'Hold expired or not found');
        
        setHold(data.data);
        // Initialize attendees array based on quantity
        const qty = data.data.quantity || 1;
        setAttendees(Array(qty).fill({ name: '', email: '' }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        toast.error(err.message);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    fetchHold();
  }, [holdId, router]);

  const updateAttendee = (index: number, field: 'name' | 'email', value: string) => {
    const newAttendees = [...attendees];
    newAttendees[index] = { ...newAttendees[index], [field]: value };
    setAttendees(newAttendees);
  };

  const handlePayment = async () => {
    // Validate attendees
    for (let i = 0; i < attendees.length; i++) {
      if (!attendees[i].name || !attendees[i].email) {
        toast.error(`Please fill all details for Attendee ${i + 1}`);
        return;
      }
    }

    setProcessing(true);
    try {
      // Create Checkout Session
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          holdId,
          attendees
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        // If Stripe is not configured, we'll simulate a success for demo purposes
        if (data.error?.code === 'PAYMENT_GATEWAY_NOT_CONFIGURED') {
           toast.success('Demo Payment Successful!');
           router.push('/tickets');
           return;
        }
        throw new Error(data.error?.message || data.message || 'Payment failed');
      }

      toast.success('Payment successful!');
      router.push('/tickets');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!hold) return null;

  const totalAmount = hold.totalCents / 100;
  const fee = totalAmount * 0.05; // Dummy 5% fee for UI
  const finalAmount = totalAmount + fee;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Form Section */}
        <div className="lg:col-span-7 space-y-8">
          <div>
            <button onClick={() => router.back()} className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 mb-6">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Checkout</h1>
            <p className="text-gray-500 mt-2 text-sm">Secure your tickets before the reservation expires.</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" /> Attendee Details
            </h2>
            <div className="space-y-6">
              {attendees.map((att, i) => (
                <div key={i} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Ticket {i + 1} - {hold.ticketTypeName}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                      <input 
                        type="text" 
                        value={att.name}
                        onChange={(e) => updateAttendee(i, 'name', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                      <input 
                        type="email" 
                        value={att.email}
                        onChange={(e) => updateAttendee(i, 'email', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" /> Payment Details
            </h2>
            <div className="p-4 border border-blue-100 bg-blue-50 text-blue-800 rounded-xl text-sm flex items-start gap-3 mb-6">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <p>This is a secure 256-bit SSL encrypted payment. Your card details are never stored on our servers.</p>
            </div>
            
            <div className="space-y-4 opacity-70 pointer-events-none">
               <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Card Number</label>
                  <input type="text" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-100" value="**** **** **** 4242" readOnly />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-100" value="12/26" readOnly />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">CVC</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-100" value="***" readOnly />
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Summary Section */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 sticky top-24 overflow-hidden">
             <div className="p-6 bg-gray-900 text-white">
                <h3 className="text-lg font-bold mb-1">{hold.eventTitle}</h3>
                <div className="flex items-center gap-2 text-gray-400 text-xs mt-3">
                  <Calendar className="w-3.5 h-3.5" /> {new Date(hold.expiresAt).toLocaleDateString()}
                </div>
             </div>
             
             <div className="p-6">
                <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Order Summary</h4>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{hold.quantity} × {hold.ticketTypeName}</span>
                    <span className="font-medium text-gray-900">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Booking Fee (5%)</span>
                    <span className="font-medium text-gray-900">₹{fee.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-gray-900">Total Amount</span>
                    <span className="text-2xl font-extrabold text-blue-600">₹{finalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <button 
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>Pay ₹{finalAmount.toFixed(2)} <CheckCircle className="w-5 h-5" /></>
                  )}
                </button>
                <p className="text-center text-xs text-gray-400 mt-4">
                  By clicking Pay, you agree to our Terms of Service and Privacy Policy.
                </p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
