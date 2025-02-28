'use client';

import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import Link from 'next/link';
import { useState } from 'react';
import { FaHome, FaList, FaUser, FaSmile } from 'react-icons/fa';

/**
 * A Radix Navigation Menu that sits centered in the screen
 * with margin on either side, plus a toggling "slide" effect
 * for demonstration.
 */
export default function NavBar() {
  // We'll do a simple toggle to demonstrate a "sliding" effect
  // You can replace this with a more advanced animation if you like
  const [open, setOpen] = useState(false);

  return (
    <div className="relative w-full flex justify-center my-4">
      <NavigationMenu.Root
        className={`
          flex items-center justify-around
          bg-white shadow-md
          rounded-full
          px-6 py-2
          transition-all
          duration-300
          ${open ? 'max-w-2xl' : 'max-w-md'}
        `}
        style={{ margin: '0 1rem' }} // margin on either side
      >
        {/* Slide toggle button */}
        <button
          onClick={() => setOpen(!open)}
          className="absolute -top-3 right-4 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center"
        >
          {open ? '-' : '+'}
        </button>

        <NavigationMenu.List className="flex items-center gap-6">
          <NavigationMenuItem href="/dashboard" label="Home" icon={<FaHome />} />
          <NavigationMenuItem href="/dashboard/plans" label="Plans" icon={<FaList />} />
          <NavigationMenuItem href="/dashboard/smile" label="Smile" icon={<FaSmile />} />
          <NavigationMenuItem href="/dashboard/profile" label="Profile" icon={<FaUser />} />
        </NavigationMenu.List>

        {/* This is optional: a viewport is where submenus could appear */}
        <NavigationMenu.Viewport className="absolute top-full left-0 w-full bg-white shadow-md" />
      </NavigationMenu.Root>
    </div>
  );
}

/** Helper for each nav item in the NavigationMenu */
function NavigationMenuItem({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <NavigationMenu.Item>
      <NavigationMenu.Link asChild>
        <Link
          href={href}
          className="flex flex-col items-center text-gray-500 hover:text-gray-900"
        >
          <div>{icon}</div>
          <span className="text-xs mt-1">{label}</span>
        </Link>
      </NavigationMenu.Link>
    </NavigationMenu.Item>
  );
}
