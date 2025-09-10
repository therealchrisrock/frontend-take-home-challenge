'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { ChevronLeft, Zap, Clock, Info } from 'lucide-react';
import { api } from '~/trpc/react';
import { type TimeControl } from '~/lib/time-control-types';
import { BoardPreview } from '~/components/game/BoardPreview';
import { GameWrapper } from '~/components/game/game-wrapper';
import { MotionColorSelector } from '~/components/game/MotionColorSelector';
import { ComingSoon } from '~/components/ui/coming-soon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';

type GameMode = 'friend' | 'local' | 'bot';
type Variant = 'american' | 'brazilian' | 'international' | 'canadian' | 'custom';
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

interface GameConfigurationProps {
  gameMode: GameMode;
  title: string;
  description: string;
}

export function GameConfiguration({ gameMode, title, description }: GameConfigurationProps) {
  const router = useRouter();
  const [variant, setVariant] = useState<Variant>('american');
  const size = useMemo(() => {
    // derive size from engine rule-configs (sync for built-ins)
    if (variant === 'international') return 10;
    if (variant === 'canadian') return 12;
    return 8;
  }, [variant]);
  const [playerColor, setPlayerColor] = useState<'red' | 'black' | 'random'>('red');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [timeControl, setTimeControl] = useState<TimeControl | null>(null);
  const [timeControlType, setTimeControlType] = useState<'none' | 'blitz' | 'rapid' | 'classical' | 'custom'>('none');
  
  const createGameMutation = api.game.create.useMutation({
    onSuccess: (data) => {
      // Simply redirect to the game page with only the ID
      // All configuration is stored in the database
      router.push(`/game/${data.id}`);
    },
  });

  const handleBack = () => {
    router.push('/game');
  };

  const handleCreateGame = () => {
    createGameMutation.mutate({
      mode: gameMode === 'friend' ? 'online' : gameMode === 'bot' ? 'ai' : 'local',
      playerName: undefined,
      boardVariant: variant === 'custom' ? 'american' : variant, // Use american for custom for now
      playerColor: playerColor === 'random' ? (Math.random() < 0.5 ? 'red' : 'black') : playerColor,
      aiDifficulty: gameMode === 'bot' ? difficulty : undefined,
      timeControl: timeControl,
    });
  };

  const getDifficultyIcon = (diff: Difficulty) => {
    switch(diff) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'hard': return '🟠';
      case 'expert': return '🔴';
    }
  };

  const getTimeControlPreset = (type: string): TimeControl | null => {
    switch (type) {
      case 'blitz':
        return { format: 'X+Y', initialMinutes: 5, incrementSeconds: 3, preset: 'blitz' };
      case 'rapid':
        return { format: 'X+Y', initialMinutes: 15, incrementSeconds: 10, preset: 'rapid' };
      case 'classical':
        return { format: 'X+Y', initialMinutes: 30, incrementSeconds: 30, preset: 'classical' };
      default:
        return null;
    }
  };

  const handleTimeControlTypeChange = (type: string) => {
    setTimeControlType(type as 'none' | 'blitz' | 'rapid' | 'classical' | 'custom');
    if (type === 'none') {
      setTimeControl(null);
    } else if (type !== 'custom') {
      setTimeControl(getTimeControlPreset(type));
    } else {
      setTimeControl({ format: 'X+Y', initialMinutes: 10, incrementSeconds: 5, preset: 'custom' });
    }
  };

  const updateCustomTimeControl = (field: keyof TimeControl, value: string | number) => {
    if (timeControl) {
      setTimeControl({ ...timeControl, [field]: value as never });
    }
  };

  return (
    <div className=" flex justify-center p-4 overflow-hidden">
      <GameWrapper>
        {/* Board Preview */}
        <div className="h-full">
          <BoardPreview 
            size={size} 
            gameMode={gameMode === 'bot' ? 'ai' : gameMode === 'local' ? 'local' : 'ai'}
            aiDifficulty={difficulty}
            shouldFlip={playerColor === 'black'}
          />
        </div>

        {/* Configuration */}
        <div className="space-y-4 overflow-y-auto max-h-full self-start lg:mt-8 w-full">
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
              onClick={handleBack}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Card className="bg-white border-gray-200 p-4">
              <div className="mb-3">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
                <p className="text-gray-600">{description}</p>
              </div>

              <div className="space-y-5">
                {/* Game Variant */}
                <div>
                  <Label className="text-gray-900 text-base mb-3 block">Game Rules</Label>
                  <TooltipProvider>
                    <RadioGroup value={variant} onValueChange={(v) => setVariant(v as Variant)}>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-start gap-2">
                          <RadioGroupItem value="american" id="american" className="sr-only" />
                          <Label
                            htmlFor="american"
                            className={`cursor-pointer w-full rounded-md p-3 border transition-colors flex items-center justify-between ${
                              variant === 'american'
                                ? 'border-amber-400 bg-amber-50'
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-gray-900 text-sm font-medium">American</div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold">American Checkers</p>
                                  <p className="text-sm">• 8×8 board (64 squares)</p>
                                  <p className="text-sm">• 12 pieces per player</p>
                                  <p className="text-sm">• Kings move one square diagonally</p>
                                  <p className="text-sm">• Regular pieces cannot capture backwards</p>
                                  <p className="text-sm">• Mandatory capture rule applies</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <RadioGroupItem value="international" id="international" className="sr-only" />
                          <Label
                            htmlFor="international"
                            className={`cursor-pointer w-full rounded-md p-3 border transition-colors flex items-center justify-between ${
                              variant === 'international'
                                ? 'border-amber-400 bg-amber-50'
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-gray-900 text-sm font-medium">International</div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold">International Draughts</p>
                                  <p className="text-sm">• 10×10 board (100 squares)</p>
                                  <p className="text-sm">• 20 pieces per player</p>
                                  <p className="text-sm">• Flying kings (move multiple squares)</p>
                                  <p className="text-sm">• Regular pieces can capture backwards</p>
                                  <p className="text-sm">• Mandatory capture rule applies</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <RadioGroupItem value="brazilian" id="brazilian" className="sr-only" />
                          <Label
                            htmlFor="brazilian"
                            className={`cursor-pointer w-full rounded-md p-3 border transition-colors flex items-center justify-between ${
                              variant === 'brazilian'
                                ? 'border-amber-400 bg-amber-50'
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-gray-900 text-sm font-medium">Brazilian</div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold">Brazilian Draughts</p>
                                  <p className="text-sm">• 8×8 board (64 squares)</p>
                                  <p className="text-sm">• 12 pieces per player</p>
                                  <p className="text-sm">• Flying kings (move multiple squares)</p>
                                  <p className="text-sm">• Regular pieces can capture backwards</p>
                                  <p className="text-sm">• Mandatory capture rule applies</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <RadioGroupItem value="canadian" id="canadian" className="sr-only" />
                          <Label
                            htmlFor="canadian"
                            className={`cursor-pointer w-full rounded-md p-3 border transition-colors flex items-center justify-between ${
                              variant === 'canadian'
                                ? 'border-amber-400 bg-amber-50'
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-gray-900 text-sm font-medium">Canadian</div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold">Canadian Checkers</p>
                                  <p className="text-sm">• 12×12 board (144 squares)</p>
                                  <p className="text-sm">• 30 pieces per player</p>
                                  <p className="text-sm">• Flying kings (move multiple squares)</p>
                                  <p className="text-sm">• Regular pieces can capture backwards</p>
                                  <p className="text-sm">• Mandatory capture rule applies</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </TooltipProvider>
                </div>

                {/* Player Settings - Only show for non-local games */}
                {gameMode !== 'local' && (
                  <div>
                    <Label className="text-gray-900 text-base mb-3 block">Player Settings</Label>
                    <div className="space-y-3">
                      <MotionColorSelector 
                        value={playerColor} 
                        onChange={(v) => setPlayerColor(v)} 
                      />

                      {gameMode === 'bot' && (
                        <div>
                          <Label className="text-gray-700 text-sm mb-2 block">Bot Difficulty</Label>
                          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                            <SelectTrigger className="bg-white border-gray-200 text-gray-900 h-8 px-2 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy"><span className="mr-2">{getDifficultyIcon('easy')}</span>Easy</SelectItem>
                              <SelectItem value="medium"><span className="mr-2">{getDifficultyIcon('medium')}</span>Medium</SelectItem>
                              <SelectItem value="hard"><span className="mr-2">{getDifficultyIcon('hard')}</span>Hard</SelectItem>
                              <SelectItem value="expert"><span className="mr-2">{getDifficultyIcon('expert')}</span>Expert</SelectItem>
                            </SelectContent>
                          </Select>
                          {difficulty === 'expert' && (
                            <p className="text-yellow-400 text-xs mt-1.5">⚠️ Expert AI is very challenging!</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Time Control Settings */}
                <div>
                  <Label className="text-gray-900 text-base mb-3 block flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Control
                  </Label>
                  <ComingSoon 
                    message="Coming Soon" 
                    variant="default"
                    icon="clock"
                    className="rounded-md overflow-hidden"
                  >
                  <div className="bg-gray-50 p-4 rounded-md space-y-3">
                    <div>
                      <Label className="text-gray-700 text-sm mb-2 block">Time Control Type</Label>
                      <Select value={timeControlType} onValueChange={handleTimeControlTypeChange}>
                        <SelectTrigger className="bg-white border-gray-200 text-gray-900 h-8 px-2 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Time Control</SelectItem>
                          <SelectItem value="blitz">⚡ Blitz (5|3)</SelectItem>
                          <SelectItem value="rapid">🚀 Rapid (15|10)</SelectItem>
                          <SelectItem value="classical">🏛️ Classical (30|30)</SelectItem>
                          <SelectItem value="custom">⚙️ Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {timeControlType === 'custom' && timeControl && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-gray-700 text-xs mb-1 block">Initial Time (minutes)</Label>
                            <Select 
                              value={timeControl.initialMinutes.toString()} 
                              onValueChange={(v) => updateCustomTimeControl('initialMinutes', parseInt(v))}
                            >
                              <SelectTrigger className="bg-white border-gray-200 text-gray-900 h-8 px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 min</SelectItem>
                                <SelectItem value="3">3 min</SelectItem>
                                <SelectItem value="5">5 min</SelectItem>
                                <SelectItem value="10">10 min</SelectItem>
                                <SelectItem value="15">15 min</SelectItem>
                                <SelectItem value="30">30 min</SelectItem>
                                <SelectItem value="60">60 min</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-gray-700 text-xs mb-1 block">Increment (seconds)</Label>
                            <Select 
                              value={timeControl.incrementSeconds.toString()} 
                              onValueChange={(v) => updateCustomTimeControl('incrementSeconds', parseInt(v))}
                            >
                              <SelectTrigger className="bg-white border-gray-200 text-gray-900 h-8 px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0 sec</SelectItem>
                                <SelectItem value="2">2 sec</SelectItem>
                                <SelectItem value="3">3 sec</SelectItem>
                                <SelectItem value="5">5 sec</SelectItem>
                                <SelectItem value="10">10 sec</SelectItem>
                                <SelectItem value="15">15 sec</SelectItem>
                                <SelectItem value="30">30 sec</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {timeControl && timeControlType !== 'none' && (
                      <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                        <strong>Preview:</strong> Each player gets {timeControl.initialMinutes} minutes
                        {timeControl.incrementSeconds && timeControl.incrementSeconds > 0 && (
                          <> + {timeControl.incrementSeconds} seconds per move</>
                        )}
                      </div>
                    )}
                  </div>
                  </ComingSoon>
                </div>

                {/* Primary Action */}
                <div className="flex pt-2">
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handleCreateGame}
                    disabled={createGameMutation.isPending}
                  >
                    {createGameMutation.isPending ? (
                      <>Creating Game...</>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Create Game
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
        </div>
      </GameWrapper>
    </div>
  );
}