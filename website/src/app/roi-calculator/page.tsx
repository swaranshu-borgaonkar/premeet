'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';

export default function RoiCalculatorPage() {
  const [professionals, setProfessionals] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(150);
  const [meetingsPerWeek, setMeetingsPerWeek] = useState(20);
  const [minutesSaved, setMinutesSaved] = useState(5);

  const calculations = useMemo(() => {
    const weeklyMinutesSaved = professionals * meetingsPerWeek * minutesSaved;
    const weeklyHoursSaved = weeklyMinutesSaved / 60;
    const weeklySavings = weeklyHoursSaved * hourlyRate;
    const monthlySavings = weeklySavings * 4.33;
    const annualSavings = weeklySavings * 52;

    // PrepMeet cost estimate (Enterprise at ~$29/seat/month)
    const monthlyCost = professionals <= 1 ? 9 : professionals * 29;
    const annualCost = monthlyCost * 12;
    const annualROI = annualSavings > 0 ? ((annualSavings - annualCost) / annualCost) * 100 : 0;

    // Without PrepMeet: manual prep time
    const weeklyManualMinutes = professionals * meetingsPerWeek * (minutesSaved + 3); // assume they still spend some time
    const weeklyManualHours = weeklyManualMinutes / 60;

    return {
      weeklyMinutesSaved,
      weeklyHoursSaved: Math.round(weeklyHoursSaved * 10) / 10,
      weeklySavings: Math.round(weeklySavings),
      monthlySavings: Math.round(monthlySavings),
      annualSavings: Math.round(annualSavings),
      monthlyCost,
      annualCost,
      annualROI: Math.round(annualROI),
      weeklyManualHours: Math.round(weeklyManualHours * 10) / 10,
      weeklyWithPrepMeet: Math.round((weeklyManualHours - weeklyHoursSaved) * 10) / 10,
    };
  }, [professionals, hourlyRate, meetingsPerWeek, minutesSaved]);

  const maxBarValue = Math.max(calculations.weeklyManualHours, 1);

  function formatCurrency(n: number): string {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              P
            </div>
            <span className="font-bold text-xl">PrepMeet</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link href="/features" className="hover:text-gray-900 transition">Features</Link>
            <Link href="/enterprise" className="hover:text-gray-900 transition">Enterprise</Link>
            <Link href="/pricing" className="hover:text-gray-900 transition">Pricing</Link>
            <Link href="/security" className="hover:text-gray-900 transition">Security</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-block bg-green-50 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          ROI Calculator
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Calculate your time savings
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          See how much time and money your team can save with automated pre-appointment context from PrepMeet.
        </p>
      </section>

      {/* Calculator */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Inputs */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold mb-6">Your team</h2>

            {/* Professionals */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-medium text-gray-900">Number of professionals</label>
                <span className="text-blue-600 font-semibold tabular-nums">{professionals}</span>
              </div>
              <input
                type="range"
                min={1}
                max={500}
                value={professionals}
                onChange={(e) => setProfessionals(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span>
                <span>500</span>
              </div>
            </div>

            {/* Hourly Rate */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-medium text-gray-900">Average hourly rate</label>
                <span className="text-blue-600 font-semibold tabular-nums">${hourlyRate}</span>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={10}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>$50</span>
                <span>$500</span>
              </div>
            </div>

            {/* Meetings Per Week */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-medium text-gray-900">Meetings per week (per person)</label>
                <span className="text-blue-600 font-semibold tabular-nums">{meetingsPerWeek}</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                value={meetingsPerWeek}
                onChange={(e) => setMeetingsPerWeek(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            {/* Minutes Saved */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-medium text-gray-900">Minutes saved per meeting</label>
                <span className="text-blue-600 font-semibold tabular-nums">{minutesSaved} min</span>
              </div>
              <input
                type="range"
                min={2}
                max={15}
                value={minutesSaved}
                onChange={(e) => setMinutesSaved(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>2 min</span>
                <span>15 min</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Your savings</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-50 rounded-xl p-5">
                <div className="text-sm text-blue-600 font-medium mb-1">Weekly time saved</div>
                <div className="text-2xl font-bold text-gray-900">{calculations.weeklyHoursSaved} hrs</div>
                <div className="text-xs text-gray-500 mt-1">{calculations.weeklyMinutesSaved} minutes</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-5">
                <div className="text-sm text-blue-600 font-medium mb-1">Weekly savings</div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(calculations.weeklySavings)}</div>
                <div className="text-xs text-gray-500 mt-1">in recovered billable time</div>
              </div>
              <div className="bg-green-50 rounded-xl p-5">
                <div className="text-sm text-green-600 font-medium mb-1">Monthly savings</div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(calculations.monthlySavings)}</div>
                <div className="text-xs text-gray-500 mt-1">PrepMeet cost: {formatCurrency(calculations.monthlyCost)}/mo</div>
              </div>
              <div className="bg-green-50 rounded-xl p-5">
                <div className="text-sm text-green-600 font-medium mb-1">Annual ROI</div>
                <div className="text-2xl font-bold text-gray-900">{calculations.annualROI > 0 ? `${calculations.annualROI}%` : 'N/A'}</div>
                <div className="text-xs text-gray-500 mt-1">Net savings: {formatCurrency(calculations.annualSavings - calculations.annualCost)}/yr</div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold mb-4">Weekly prep time comparison</h3>
              <div className="space-y-4">
                {/* Without PrepMeet */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600">Without PrepMeet</span>
                    <span className="font-medium">{calculations.weeklyManualHours} hrs/week</span>
                  </div>
                  <div className="h-8 bg-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gray-400 rounded-lg transition-all duration-500 ease-out"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                {/* With PrepMeet */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600">With PrepMeet</span>
                    <span className="font-medium text-blue-600">{calculations.weeklyWithPrepMeet} hrs/week</span>
                  </div>
                  <div className="h-8 bg-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-lg transition-all duration-500 ease-out"
                      style={{ width: `${maxBarValue > 0 ? (calculations.weeklyWithPrepMeet / maxBarValue) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                {/* Time saved */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600">Time saved</span>
                    <span className="font-medium text-green-600">{calculations.weeklyHoursSaved} hrs/week</span>
                  </div>
                  <div className="h-8 bg-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-lg transition-all duration-500 ease-out"
                      style={{ width: `${maxBarValue > 0 ? (calculations.weeklyHoursSaved / maxBarValue) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Annual Summary */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-center mb-8">Annual impact summary</h2>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">{Math.round(calculations.weeklyHoursSaved * 52).toLocaleString()}</div>
              <div className="text-sm text-gray-600 mt-1">hours saved per year</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{formatCurrency(calculations.annualSavings)}</div>
              <div className="text-sm text-gray-600 mt-1">gross annual savings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(calculations.annualCost)}</div>
              <div className="text-sm text-gray-600 mt-1">annual PrepMeet cost</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">{formatCurrency(calculations.annualSavings - calculations.annualCost)}</div>
              <div className="text-sm text-gray-600 mt-1">net annual savings</div>
            </div>
          </div>
        </div>
      </section>

      {/* How We Calculate */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">How we calculate</h2>
        <div className="space-y-4 text-sm text-gray-600">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
            <p><strong className="text-gray-900">Time saved</strong> = Professionals x Meetings/week x Minutes saved per meeting</p>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
            <p><strong className="text-gray-900">Dollar savings</strong> = Time saved (in hours) x Average hourly rate</p>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
            <p><strong className="text-gray-900">ROI</strong> = (Annual savings - Annual PrepMeet cost) / Annual PrepMeet cost x 100</p>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
            <p><strong className="text-gray-900">PrepMeet cost</strong> = $9/mo for individuals, $29/seat/mo for teams (Enterprise pricing available)</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-12 pb-24">
        <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Save {formatCurrency(calculations.annualSavings - calculations.annualCost)} per year
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Based on your inputs, PrepMeet would save your team{' '}
            {Math.round(calculations.weeklyHoursSaved * 52).toLocaleString()} hours and{' '}
            {formatCurrency(calculations.annualSavings - calculations.annualCost)} annually. Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/download"
              className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-50 transition"
            >
              Start Free Trial
            </Link>
            <a
              href="mailto:sales@prepmeet.com"
              className="inline-block border border-white/30 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-white/10 transition"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>&copy; {new Date().getFullYear()} PrepMeet. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-gray-700 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-700 transition">Terms</Link>
            <Link href="/security" className="hover:text-gray-700 transition">Security</Link>
            <Link href="/enterprise" className="hover:text-gray-700 transition">Enterprise</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
