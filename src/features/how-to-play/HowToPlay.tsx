/**
 * HowToPlay.tsx
 * -------------
 * Beginner guide to MARS: OUTPOST ZERO. Every name, number and rule here is
 * taken from the game itself (panel titles, action effects, thresholds), so if
 * you change the game, update this page too.
 */

import type { ReactElement, ReactNode } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle,
  Gauge,
  Lightbulb,
  ListChecks,
  Target,
  UserRound,
  Wrench,
} from 'lucide-react';

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Target;
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="panel p-5">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-100">
        <Icon className="h-5 w-5 text-mars-orange" aria-hidden />
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

function Term({ name, children }: { name: string; children: ReactNode }): ReactElement {
  return (
    <li>
      <strong className="font-semibold text-slate-100">{name}</strong> {children}
    </li>
  );
}

interface HowToPlayProps {
  /** Opens the interactive tutorial as an overlay. Passed from App. */
  onReplayTutorial?: () => void;
}

export function HowToPlay({ onReplayTutorial }: HowToPlayProps): ReactElement {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-slate-100">How to Play</h1>
            <p className="max-w-prose text-slate-300">
              You run a small outpost on Mars. Each Sol (one Martian day) you check how things are, pick an
              action, and move on to the next Sol. No experience needed.
            </p>
          </div>
          {onReplayTutorial ? (
            <button
              type="button"
              onClick={onReplayTutorial}
              className="btn-secondary shrink-0"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              Replay Tutorial
            </button>
          ) : null}
        </div>
      </header>

      <Section icon={Target} title="The goal">
        <p>
          Keep your character and outpost alive for <strong className="text-slate-100">30 Sols</strong>.
          Along the way, emergencies will test you and every choice has a cost.
        </p>
        <p>
          You lose if oxygen or your health reaches 0, or if radiation reaches 100. Until then you can
          always recover from a bad moment.
        </p>
      </Section>

      <Section icon={ListChecks} title="Your first Sol, step by step">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Open <strong className="text-slate-100">Mission Setup</strong> in the sidebar, choose a role
            (see below), and press <strong className="text-slate-100">Launch Run</strong>. The other
            settings are fine on their defaults.
          </li>
          <li>
            Go to <strong className="text-slate-100">Mission Control</strong>. Look at{' '}
            <strong className="text-slate-100">Resource Overview</strong>: are any of the four bars low?
          </li>
          <li>
            Glance at <strong className="text-slate-100">Vitals</strong> (your health, morale and radiation)
            and <strong className="text-slate-100">Systems</strong>.
          </li>
          <li>
            In <strong className="text-slate-100">Operations</strong>, read the Mission Controller's advice,
            then pick one <strong className="text-slate-100">Routine Action</strong>. Hover over a button to
            see what it does.
          </li>
          <li>
            Press <strong className="text-slate-100">Advance Day</strong> at the top. Watch the{' '}
            <strong className="text-slate-100">Activity Feed</strong> to see what changed.
          </li>
          <li>
            If an emergency pops up, read it and choose a response. You must answer it before you can
            advance the day.
          </li>
        </ol>
        <p>
          Press <strong className="text-slate-100">Save</strong> in the top bar now and then to keep your
          progress.
        </p>
      </Section>

      <Section icon={Gauge} title="Reading the numbers">
        <p>
          Everything is a percentage from 0 to 100, and every bar uses the same colours:{' '}
          <span className="font-semibold text-status-ok">green</span> is fine (above 35),{' '}
          <span className="font-semibold text-status-warn">amber</span> means be careful (16 to 35), and{' '}
          <span className="font-semibold text-status-critical">red</span> is in danger (15 or below).
          Radiation works the other way round: lower is better, amber from 60, red from 80.
        </p>
        <p>Each Sol the crew uses up resources by itself, and your systems refill some of them.</p>

        <div>
          <h3 className="mb-1 font-semibold text-slate-100">Resources (the four reserves)</h3>
          <ul className="space-y-1">
            <Term name="Power">runs everything in the outpost.</Term>
            <Term name="Water">for drinking, food and life support.</Term>
            <Term name="Food">keeps you fed; the greenhouse produces more.</Term>
            <Term name="Oxygen">the most urgent one. If it hits 0, the mission is over.</Term>
          </ul>
        </div>

        <div>
          <h3 className="mb-1 font-semibold text-slate-100">Vitals (you)</h3>
          <ul className="space-y-1">
            <Term name="Crew Health">reaching 0 ends the mission.</Term>
            <Term name="Morale">how you feel. When it is low you use up supplies a little faster.</Term>
            <Term name="Radiation Exposure">builds up over time; reaching 100 ends the mission.</Term>
          </ul>
        </div>

        <div>
          <h3 className="mb-1 font-semibold text-slate-100">Systems (the machines)</h3>
          <ul className="space-y-1">
            <Term name="Power Generation">how fast your solar power refills.</Term>
            <Term name="Life Support">keeps air and water recycling.</Term>
            <Term name="Food Production">how well the greenhouse grows food.</Term>
            <Term name="Shielding">protects you from radiation.</Term>
          </ul>
          <p className="mt-2">
            Systems wear down over time. Keep them healthy and the resources mostly look after
            themselves.
          </p>
        </div>
      </Section>

      <Section icon={UserRound} title="Choosing a role">
        <p>
          Your role decides your starting strengths and gives you one special ability. You only see the full
          stats after you launch, so just pick the one that sounds fun.
        </p>
        <ul className="space-y-1">
          <Term name="Engineer:">repairs and equipment. Your systems wear down more slowly.</Term>
          <Term name="Scientist:">research and problem-solving. You make mission progress faster.</Term>
          <Term name="Medical Officer:">health and survival. You recover health and resist radiation.</Term>
          <Term name="Botanist:">food and biology. The greenhouse gives extra food every day.</Term>
          <Term name="Geologist:">rocks and ice. You find extra water every day.</Term>
          <Term name="Chemist:">air and chemistry. You make extra oxygen every day.</Term>
          <Term name="Commander:">leadership. Your morale recovers a little every day.</Term>
          <Term name="Pilot:">outdoor work and solar panels. You get extra power every day.</Term>
        </ul>
      </Section>

      <Section icon={Wrench} title="Daily actions">
        <p>Every Sol you can take one of these Routine Actions (or just advance the day).</p>
        <ul className="space-y-1">
          <Term name="Routine operations:">do nothing special. A safe default.</Term>
          <Term name="Ration supplies:">+3 food and +2 water, but morale drops by 3.</Term>
          <Term name="Maintenance shift:">power drops by 4 and morale by 2, but Life Support and Power
            Generation improve.</Term>
        </ul>
        <p>
          Nothing is free. Fixing one thing usually costs something else, so look for the number that is
          closest to red.
        </p>
      </Section>

      <Section icon={Lightbulb} title="The Mission Controller's advice">
        <p>
          At the top of Operations, the Mission Controller suggests a Routine Action and says why. The
          suggested button gets a star (★). It is a simple rule-based helper, so treat it as a hint, not an
          order. Following it or choosing something else are both allowed, and both count towards badges.
        </p>
      </Section>

      <Section icon={AlertTriangle} title="Emergencies and delayed effects">
        <p>
          Sometimes an event appears, like a solar storm or a failed battery. A pop-up shows the problem
          and your options. Events are labelled Critical, Major, Minor or Info, and the Info and Minor ones
          are often good news.
        </p>
        <p>
          The important idea: <strong className="text-slate-100">some costs arrive later.</strong> The
          Pending Effects panel lists what is on its way. Here is a real example:
        </p>
        <div className="rounded-md border border-space-600 bg-space-900/60 p-3">
          <div className="mb-2 font-semibold text-slate-100">Solar Storm Detected</div>
          <ul className="space-y-2">
            <li>
              <strong className="text-slate-100">Activate Full Shielding:</strong> power drops by 30 right
              now, but radiation falls. Power Generation recovers in 2 Sols.
            </li>
            <li>
              <strong className="text-slate-100">Shut Down Non-Essential Systems:</strong> saves power, but
              food production drops and radiation rises. Health suffers the next Sol.
            </li>
            <li>
              <strong className="text-slate-100">Maintain Operations:</strong> looks easy, but radiation jumps
              by 25 and bigger damage hits a few Sols later.
            </li>
          </ul>
        </div>
        <p>
          The easy choice now is often the expensive one later. That is how real missions work too.
        </p>
      </Section>

      <Section icon={Award} title="Your progress">
        <p>
          Alongside survival, the game rewards you for playing well. You do not need to manage any of this.
          It builds up on its own.
        </p>
        <ul className="space-y-1">
          <Term name="XP and rank:">10 XP for each decision, 30 for answering an emergency, and 5 for each
            Sol you survive. More XP raises your rank, from Trainee to Mars Legend.</Term>
          <Term name="Mood:">a quick read on how you are holding up. If it says Worried or Struggling, look
            after morale and health first.</Term>
          <Term name="Badges:">small goals like reaching Sol 10. Open Badges in the sidebar to see how to earn
            each one.</Term>
        </ul>
      </Section>

      <Section icon={CheckCircle} title="Winning and losing">
        <p>
          <strong className="text-slate-100">You win</strong> by surviving all 30 Sols. Your score grows with
          how long you last and how well you manage resources.
        </p>
        <p>
          <strong className="text-slate-100">The mission fails</strong> if oxygen reaches 0, your health
          reaches 0, or radiation reaches 100.
        </p>
        <p>
          Before that, the status turns <strong className="text-slate-100">Critical</strong> when any
          resource or your health is 15 or below, or radiation is 80 or above. Critical is a warning, and you
          can recover from it.
        </p>
      </Section>

      <Section icon={ListChecks} title="Quick tips">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fix the lowest bar first, especially Oxygen.</li>
          <li>Do not let one resource run down while the others are full.</li>
          <li>Look at Pending Effects before you advance the day. Bad news may already be on its way.</li>
          <li>Keep morale up. Several actions cost a little morale, so it can slip without you noticing.</li>
          <li>If you fail, that is part of learning. Start a new mission and try a different approach.</li>
          <li>All numbers here are made up for the game. They are not real NASA data.</li>
        </ul>
      </Section>
    </div>
  );
}
