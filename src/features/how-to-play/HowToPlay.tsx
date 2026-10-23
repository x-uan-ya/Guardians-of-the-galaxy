/**
 * HowToPlay.tsx
 * -------------
 * Comprehensive beginner-friendly guide to playing Mars: Outpost Zero
 */

import type { ReactElement } from 'react';
import { 
  Zap, 
  Droplet, 
  Wheat, 
  Wind, 
  Wrench, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Calendar,
  HelpCircle,
  Award
} from 'lucide-react';

export function HowToPlay(): ReactElement {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold text-white">
          How to Play <span className="text-mars-orange">Mars: Outpost Zero</span>
        </h1>
        <p className="text-lg text-gray-300">
          A complete beginner's guide to surviving on the Red Planet
        </p>
      </div>

      {/* Quick Start */}
      <section className="rounded-lg border border-mars-orange/30 bg-mars-deep/20 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-mars-orange">
          <Target className="h-6 w-6" />
          Quick Start
        </h2>
        <div className="space-y-3 text-gray-200">
          <p><strong className="text-white">Goal:</strong> Keep your Mars outpost alive for 30 Sols (a Sol is one Martian day).</p>
          <p><strong className="text-white">How to Win:</strong> Balance your resources, make smart decisions, and survive crises.</p>
          <p><strong className="text-white">How to Lose:</strong> If oxygen or your health hits 0, or radiation hits 100, your mission fails.</p>
        </div>
      </section>

      {/* Understanding Resources */}
      <section className="rounded-lg border border-space-600 bg-space-800 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
          <TrendingUp className="h-6 w-6" />
          Understanding Resources
        </h2>
        <p className="mb-4 text-gray-300">
          Your outpost has <strong>4 critical resources</strong> that you must keep balanced:
        </p>

        <div className="space-y-4">
          {/* Power */}
          <div className="rounded-md border border-yellow-600/30 bg-yellow-950/20 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-yellow-400">Power</h3>
            </div>
            <p className="text-sm text-gray-300 mb-2">
              Electricity stored in batteries. Powers everything in your outpost.
            </p>
            <div className="rounded bg-yellow-900/30 p-2 text-xs text-yellow-200">
              <strong>💡 Tip:</strong> Solar panels generate power during the day. Running low? Reduce power-hungry activities.
            </div>
          </div>

          {/* Water */}
          <div className="rounded-md border border-blue-600/30 bg-blue-950/20 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Droplet className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-blue-400">Water</h3>
            </div>
            <p className="text-sm text-gray-300 mb-2">
              Essential for drinking, growing food, and life support systems.
            </p>
            <div className="rounded bg-blue-900/30 p-2 text-xs text-blue-200">
              <strong>💡 Tip:</strong> Water can be recycled from waste. Prioritize water-saving decisions when low.
            </div>
          </div>

          {/* Food */}
          <div className="rounded-md border border-green-600/30 bg-green-950/20 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Wheat className="h-5 w-5 text-green-400" />
              <h3 className="text-lg font-semibold text-green-400">Food</h3>
            </div>
            <p className="text-sm text-gray-300 mb-2">
              Keeps your crew fed and healthy. Grown in the hydroponics greenhouse.
            </p>
            <div className="rounded bg-green-900/30 p-2 text-xs text-green-200">
              <strong>💡 Tip:</strong> Food production takes time. Plan ahead and maintain your greenhouse systems.
            </div>
          </div>

          {/* Oxygen */}
          <div className="rounded-md border border-cyan-600/30 bg-cyan-950/20 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Wind className="h-5 w-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-cyan-400">Oxygen</h3>
            </div>
            <p className="text-sm text-gray-300 mb-2">
              Breathable air for your crew. Produced by life support systems.
            </p>
            <div className="rounded bg-cyan-900/30 p-2 text-xs text-cyan-200">
              <strong>💡 Tip:</strong> Critical resource! Always keep oxygen above 20. If it drops too low, mission over.
            </div>
          </div>
        </div>
      </section>

      {/* Understanding Systems */}
      <section className="rounded-lg border border-space-600 bg-space-800 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
          <Wrench className="h-6 w-6" />
          Understanding Systems
        </h2>
        <p className="mb-4 text-gray-300">
          Your outpost has <strong>3 support systems</strong> that need maintenance:
        </p>

        <div className="space-y-3">
          <div className="rounded-md border border-gray-600 bg-gray-900/50 p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-white">Systems (Equipment)</h3>
                <p className="text-sm text-gray-300">All machinery and equipment functionality</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Target</div>
                <div className="font-mono text-green-400">80-100%</div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-gray-600 bg-gray-900/50 p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-white">Morale (Crew Happiness)</h3>
                <p className="text-sm text-gray-300">How motivated and healthy your crew is</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Target</div>
                <div className="font-mono text-green-400">60-100%</div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-gray-600 bg-gray-900/50 p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-white">Food Production (Greenhouse)</h3>
                <p className="text-sm text-gray-300">How efficiently your crops are growing</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Target</div>
                <div className="font-mono text-green-400">70-100%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-orange-950/30 border border-orange-600/30 p-3 text-sm text-orange-200">
          <strong>⚠️ Warning:</strong> Low systems = equipment failures. Low morale = poor decisions. Low food production = starvation risk.
        </div>
      </section>

      {/* Making Decisions */}
      <section className="rounded-lg border border-space-600 bg-space-800 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
          <Calendar className="h-6 w-6" />
          Making Decisions
        </h2>
        <p className="mb-4 text-gray-300">
          Each day (Sol), you'll see available actions. Each action has <strong>trade-offs</strong>:
        </p>

        <div className="space-y-4">
          {/* Example Decision */}
          <div className="rounded-lg border-2 border-gray-600 bg-gray-900/80 p-4">
            <h3 className="mb-2 font-semibold text-white">Example Action: "Maintenance Shift"</h3>
            <p className="mb-3 text-sm text-gray-300">Crew performs routine equipment checks</p>
            
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-red-400">Power: -5</span>
                <span className="text-gray-400">(Uses electricity for tools)</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-green-400">Systems: +8</span>
                <span className="text-gray-400">(Improves equipment condition)</span>
              </div>
            </div>

            <div className="mt-3 rounded bg-blue-900/30 p-2 text-xs text-blue-200">
              <strong>🎯 Strategy:</strong> Good to do when systems are low and you have spare power.
            </div>
          </div>

          {/* Understanding Colors */}
          <div className="rounded-md border border-space-600 bg-space-900/60 p-4">
            <h3 className="mb-3 font-semibold text-slate-100">Understanding Resource Changes:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-green-400 font-mono">+10</span>
                <span className="text-gray-300">= Increase (Good!)</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-red-400 font-mono">-10</span>
                <span className="text-gray-300">= Decrease (Cost)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">⏱</span>
                <span className="text-yellow-400">Delayed effect</span>
                <span className="text-gray-300">= Happens in a few days</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events & Crises */}
      <section className="rounded-lg border border-red-600/30 bg-red-950/20 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-red-400">
          <AlertTriangle className="h-6 w-6" />
          Events & Crises
        </h2>
        <p className="mb-4 text-gray-200">
          Mars is dangerous! Random events will test your decision-making:
        </p>

        <div className="space-y-3">
          <div className="rounded-md bg-red-900/40 p-3 border border-red-600/50">
            <div className="mb-1 font-semibold text-red-300">🚨 CRITICAL EVENT - Solar Storm</div>
            <p className="text-sm text-gray-200">Must choose immediately. High stakes decisions!</p>
          </div>

          <div className="rounded-md bg-orange-900/40 p-3 border border-orange-600/50">
            <div className="mb-1 font-semibold text-orange-300">⚠️ MAJOR EVENT - Equipment Failure</div>
            <p className="text-sm text-gray-200">Important decisions that significantly impact your mission.</p>
          </div>

          <div className="rounded-md bg-yellow-900/40 p-3 border border-yellow-600/50">
            <div className="mb-1 font-semibold text-yellow-300">📍 EVENT - Supply Discovery</div>
            <p className="text-sm text-gray-200">Minor events with smaller impacts.</p>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-red-900/30 border border-red-600/30 p-3 text-sm text-red-200">
          <strong>🚫 Important:</strong> When an event appears, you MUST resolve it before continuing. The "Advance Day" button will be disabled.
        </div>
      </section>

      {/* Step-by-Step Gameplay */}
      <section className="rounded-lg border border-space-600 bg-space-800 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
          <CheckCircle className="h-6 w-6" />
          Step-by-Step: Your First Day
        </h2>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-mars-orange text-white font-bold">1</div>
            <div>
              <h3 className="font-semibold text-white">Look at Your Resources</h3>
              <p className="text-sm text-gray-300">Check the Resource Overview panel. Are any resources low (below 30)?</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-mars-orange text-white font-bold">2</div>
            <div>
              <h3 className="font-semibold text-white">Check System Status</h3>
              <p className="text-sm text-gray-300">Look at Systems, Morale, and Food Production. Anything below 50%?</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-mars-orange text-white font-bold">3</div>
            <div>
              <h3 className="font-semibold text-white">Read Available Actions</h3>
              <p className="text-sm text-gray-300">Look at the Operations Panel. Read what each action does and its costs/benefits.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-mars-orange text-white font-bold">4</div>
            <div>
              <h3 className="font-semibold text-white">Choose Wisely</h3>
              <p className="text-sm text-gray-300">Pick actions that fix your lowest resources or improve weak systems.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-mars-orange text-white font-bold">5</div>
            <div>
              <h3 className="font-semibold text-white">Click "Advance Day"</h3>
              <p className="text-sm text-gray-300">Press the orange button to proceed to the next day. Watch what happens!</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-mars-orange text-white font-bold">6</div>
            <div>
              <h3 className="font-semibold text-white">React to Events</h3>
              <p className="text-sm text-gray-300">If an event pops up, read it carefully and choose the option that helps your situation most.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tips for Beginners */}
      <section className="rounded-lg border border-green-600/30 bg-green-950/20 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-green-400">
          <HelpCircle className="h-6 w-6" />
          Tips for Beginners
        </h2>
        
        <div className="space-y-3 text-sm text-gray-200">
          <div className="flex gap-2">
            <span className="text-green-400 font-bold">✓</span>
            <p><strong className="text-white">Keep Oxygen above 20 at all times</strong> - This is your most critical resource!</p>
          </div>
          <div className="flex gap-2">
            <span className="text-green-400 font-bold">✓</span>
            <p><strong className="text-white">Balance is key</strong> - Don't let any single resource get too low</p>
          </div>
          <div className="flex gap-2">
            <span className="text-green-400 font-bold">✓</span>
            <p><strong className="text-white">Plan ahead</strong> - Some actions have delayed effects. Think 2-3 days ahead.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-green-400 font-bold">✓</span>
            <p><strong className="text-white">Maintain your systems</strong> - Regular maintenance prevents major failures</p>
          </div>
          <div className="flex gap-2">
            <span className="text-green-400 font-bold">✓</span>
            <p><strong className="text-white">Don't ignore morale</strong> - Unhappy crew = bad performance</p>
          </div>
          <div className="flex gap-2">
            <span className="text-green-400 font-bold">✓</span>
            <p><strong className="text-white">Save your game</strong> - Click "Save" button regularly!</p>
          </div>
          <div className="flex gap-2">
            <span className="text-green-400 font-bold">✓</span>
            <p><strong className="text-white">Hover over terms</strong> - See dotted underlines? Hover to learn what technical terms mean!</p>
          </div>
        </div>
      </section>

      {/* Progress: XP, rank, mood, badges */}
      <section className="rounded-lg border border-space-600 bg-space-800 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
          <Award className="h-6 w-6" />
          Your Progress
        </h2>
        <p className="mb-4 text-gray-300">
          Alongside survival, the game rewards you for playing well. You don't need to manage any of this.
          It builds up on its own.
        </p>
        <ul className="space-y-3 text-sm text-gray-300">
          <li>
            <strong className="text-white">XP and rank:</strong> you earn XP for every decision, extra for
            answering an emergency, and a little for each Sol you survive. More XP means a higher rank, from
            Trainee up to Mars Legend.
          </li>
          <li>
            <strong className="text-white">Mood:</strong> a quick read on how your character is holding up,
            based on morale, health and radiation. If it says Worried or Struggling, look after those first.
          </li>
          <li>
            <strong className="text-white">Badges:</strong> small goals like reaching Sol 10 or keeping all
            systems high. Open <strong className="text-white">Badges</strong> in the sidebar to see how to earn
            each one.
          </li>
        </ul>
      </section>

      {/* Winning & Losing */}
      <section className="rounded-lg border border-space-600 bg-space-800 p-6">
        <h2 className="mb-4 text-2xl font-bold text-white">Winning & Losing</h2>
        
        <div className="space-y-4">
          <div className="rounded-md border border-green-600/50 bg-green-950/30 p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-green-400">
              <CheckCircle className="h-5 w-5" />
              Success
            </h3>
            <p className="text-sm text-gray-200">
              Survive all <strong>30 Sols</strong> to complete the mission. Your <strong>score</strong> grows with how long you survive and how well you manage resources.
            </p>
          </div>

          <div className="rounded-md border border-red-600/50 bg-red-950/30 p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Mission Failure
            </h3>
            <p className="text-sm text-gray-200 mb-2">Your mission fails if any of these happen:</p>
            <ul className="space-y-1 text-sm text-gray-300 list-disc list-inside">
              <li>Oxygen reaches 0 (crew suffocates)</li>
              <li>Your health reaches 0</li>
              <li>Radiation exposure reaches 100</li>
            </ul>
            <p className="mt-2 text-xs text-gray-400">
              The mission turns <strong>Critical</strong> before that: when any resource or your health is at 15 or below, or radiation is at 80 or above. You can still recover from Critical.
            </p>
          </div>
        </div>
      </section>

      {/* Ready to Play */}
      <section className="rounded-lg border-2 border-mars-orange bg-gradient-to-r from-mars-deep to-space-900 p-8 text-center">
        <h2 className="mb-3 text-3xl font-bold text-white">Ready to Begin Your Mission?</h2>
        <p className="mb-4 text-gray-200">
          You now know the basics! Head to <strong className="text-mars-orange">Mission Control</strong> to start playing.
        </p>
        <p className="text-sm text-gray-400">
          Remember: Survival on Mars requires smart decisions, careful planning, and a bit of luck. Good luck, Commander! 🚀
        </p>
      </section>
    </div>
  );
}
