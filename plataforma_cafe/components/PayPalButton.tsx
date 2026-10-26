"use client";

import { useRef, useEffect } from "react";
import { CONFIG } from "@/lib/config";

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: Record<string, unknown>) => { render: (el: HTMLElement) => void };
    };
  }
}

interface PayPalButtonProps {
  amount: number;
  currency?: string;
  description: string;
  onSuccess: (orderID: string, payerID: string) => void;
  onError?: (err: unknown) => void;
  disabled?: boolean;
}

export function PayPalButton({
  amount,
  currency = CONFIG.paypalCurrency,
  description,
  onSuccess,
  onError,
  disabled,
}: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (!CONFIG.paypalClientId || rendered.current || !containerRef.current) return;

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${CONFIG.paypalClientId}&currency=${currency}`;
    script.async = true;
    script.onload = () => {
      if (!window.paypal || !containerRef.current) return;
      window.paypal.Buttons({
        style: { layout: "vertical", color: "blue", shape: "rect", label: "paypal", height: 48 },
        createOrder: (_data: unknown, actions: unknown) => {
          return (actions as { order: { create: (o: unknown) => Promise<string> } }).order.create({
            purchase_units: [{
              description,
              amount: { currency_code: currency, value: amount.toFixed(2) },
            }],
          });
        },
        onApprove: async (data: unknown) => {
          const d = data as { orderID: string; payerID: string };
          onSuccess(d.orderID, d.payerID);
        },
        onError: (err: unknown) => {
          onError?.(err);
        },
      }).render(containerRef.current);
      rendered.current = true;
    };
    document.head.appendChild(script);

    return () => { script.remove(); };
  }, [amount, currency, description, onSuccess, onError]);

  if (!CONFIG.paypalClientId) {
    return (
      <p className="text-sm text-pizarra/60 italic">
        PayPal no está configurado actualmente.
      </p>
    );
  }

  return <div ref={containerRef} className={disabled ? "opacity-50 pointer-events-none" : ""} />;
}
