'use client';

import { ComingSoon } from '~/components/ui/coming-soon';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';

export default function TestComingSoonPage() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">Coming Soon Component Examples</h1>
      
      {/* Example 1: Default variant */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Default Variant</h2>
        <ComingSoon className="h-40 bg-gray-100 rounded-lg">
          <div className="p-4">
            <p>This content is overlaid by the coming soon component</p>
          </div>
        </ComingSoon>
      </div>

      {/* Example 2: Minimal variant */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Minimal Variant</h2>
        <ComingSoon 
          variant="minimal" 
          message="Feature in Development"
          className="h-20 bg-blue-50 rounded-lg"
        >
          <div className="p-4">
            <p>Some placeholder content here</p>
          </div>
        </ComingSoon>
      </div>

      {/* Example 3: Detailed variant with different icons */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Detailed Variant with Different Icons</h2>
        <div className="grid grid-cols-2 gap-4">
          <ComingSoon 
            variant="detailed" 
            message="Analytics Dashboard"
            description="Track your game statistics and performance metrics"
            icon="sparkles"
            className="h-48 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg"
          />
          
          <ComingSoon 
            variant="detailed" 
            message="Tournament Mode"
            description="Compete in ranked matches and climb the leaderboard"
            icon="snowflake"
            className="h-48 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg"
          />
          
          <ComingSoon 
            variant="detailed" 
            message="Time Controls"
            description="Chess-style time limits for competitive play"
            icon="clock"
            className="h-48 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg"
          />
          
          <ComingSoon 
            variant="detailed" 
            message="Custom Rules"
            description="Create your own game variants with custom rules"
            icon="construction"
            className="h-48 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg"
          />
        </div>
      </div>

      {/* Example 4: Overlaying a Card component */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Overlaying a Card Component</h2>
        <ComingSoon 
          message="Premium Features"
          description="Unlock with Pro subscription"
          variant="default"
          className="rounded-lg overflow-hidden"
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Advanced Settings</h3>
            <div className="space-y-2">
              <Button className="w-full">Configure AI Personality</Button>
              <Button className="w-full">Custom Board Themes</Button>
              <Button className="w-full">Export Game History</Button>
            </div>
          </Card>
        </ComingSoon>
      </div>

      {/* Example 5: Without icon */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Without Icon</h2>
        <ComingSoon 
          message="Coming in Version 2.0"
          showIcon={false}
          className="h-32 bg-gray-100 rounded-lg"
        />
      </div>
    </div>
  );
}