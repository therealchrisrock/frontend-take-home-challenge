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
import { getBoardConfig } from '~/lib/board-config';
import { BoardPreview } from '~/components/game/BoardPreview';
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
  const boardConfig = useMemo(() => {
    if (variant === 'custom') {
      return getBoardConfig('american');
    }
    return getBoardConfig(variant as any);
  }, [variant]);
  const [playerColor, setPlayerColor] = useState<'red' | 'black' | 'random'>('red');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [timeControl, setTimeControl] = useState<TimeControl | null>(null);
  const [timeControlType, setTimeControlType] = useState<'none' | 'blitz' | 'rapid' | 'classical' | 'custom'>('none');
  
  const createGameMutation = api.game.create.useMutation({
    onSuccess: (data) => {
      const searchParams = new URLSearchParams();
      if (timeControl) {
        searchParams.set('timeControl', JSON.stringify(timeControl));
      }
      searchParams.set('gameMode', gameMode === 'friend' ? 'online' : gameMode === 'bot' ? 'ai' : 'local');
      searchParams.set('boardVariant', variant === 'custom' ? 'american' : variant);
      
      const url = `/game/${data.id}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      router.push(url);
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
    setTimeControlType(type as any);
    if (type === 'none') {
      setTimeControl(null);
    } else if (type !== 'custom') {
      setTimeControl(getTimeControlPreset(type));
    } else {
      setTimeControl({ format: 'X+Y', initialMinutes: 10, incrementSeconds: 5, preset: 'custom' });
    }
  };

  const updateCustomTimeControl = (field: keyof TimeControl, value: any) => {
    if (timeControl) {
      setTimeControl({ ...timeControl, [field]: value });
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full h-full">
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-8 h-full">
          {/* Board Preview */}
          <div className="h-full">
            <BoardPreview 
              config={boardConfig} 
              gameMode={gameMode === 'bot' ? 'ai' : gameMode === 'local' ? 'local' : 'ai'}
              aiDifficulty={difficulty}
            />
          </div>

          {/* Configuration */}
          <div className="space-y-4 overflow-y-auto max-h-full self-start">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white"
              onClick={handleBack}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Card className="bg-gray-800/80 border-gray-700 p-4">
              <div className="mb-3">
                <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
                <p className="text-gray-400">{description}</p>
              </div>

              <div className="space-y-5">
                {/* Game Variant */}
                <div>
                  <Label className="text-white text-base mb-3 block">Game Rules</Label>
                  <TooltipProvider>
                    <RadioGroup value={variant} onValueChange={(v) => setVariant(v as Variant)}>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-start gap-2">
                          <RadioGroupItem value="american" id="american" className="sr-only" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Label
                                htmlFor="american"
                                className={`cursor-pointer w-full rounded-md p-3 border transition-colors flex items-center justify-between ${
                                  variant === 'american'
                                    ? 'border-blue-500 bg-blue-600/10'
                                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                                }`}
                              >
                                <div className="text-white text-sm font-medium">American</div>
                                <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              </Label>
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
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <RadioGroupItem value="international" id="international" className="sr-only" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Label
                                htmlFor="international"
                                className={`cursor-pointer w-full rounded-md p-3 border transition-colors flex items-center justify-between ${
                                  variant === 'international'
                                    ? 'border-blue-500 bg-blue-600/10'
                                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                                }`}
                              >
                                <div className="text-white text-sm font-medium">International</div>
                                <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              </Label>
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
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <RadioGroupItem value="brazilian" id="brazilian" className="sr-only" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Label
                                htmlFor="brazilian"
                                className={`cursor-pointer w-full rounded-md p-3 border transition-colors flex items-center justify-between ${
                                  variant === 'brazilian'
                                    ? 'border-blue-500 bg-blue-600/10'
                                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                                }`}
                              >
                                <div className="text-white text-sm font-medium">Brazilian</div>
                                <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              </Label>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
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
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <RadioGroupItem value="canadian" id="canadian" className="sr-only" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Label
                                htmlFor="canadian"
                                className={`cursor-pointer w-full rounded-md p-3 border transition-colors flex items-center justify-between ${
                                  variant === 'canadian'
                                    ? 'border-blue-500 bg-blue-600/10'
                                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                                }`}
                              >
                                <div className="text-white text-sm font-medium">Canadian</div>
                                <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              </Label>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
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
                        </div>
                      </div>
                    </RadioGroup>
                  </TooltipProvider>
                </div>

                {/* Player Settings */}
                <div>
                  <Label className="text-white text-base mb-3 block">Player Settings</Label>
                  <div className="bg-gray-700/30 p-4 rounded-md space-y-3">
                    {gameMode !== 'local' && (
                      <div>
                        <Label className="text-gray-300 text-sm mb-1.5 block">Your Color</Label>
                        <RadioGroup value={playerColor} onValueChange={(v) => setPlayerColor(v as any)}>
                          <div className="flex gap-2">
                            <RadioGroupItem value="red" id="red" className="sr-only" />
                            <Label
                              htmlFor="red"
                              className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer ${
                                playerColor === 'red'
                                  ? 'border-blue-500 bg-blue-600/10'
                                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                              }`}
                            >
                              <div className="w-5 h-5 rounded-full bg-red-600 border-2 border-red-700" />
                              <span className="text-white text-sm">Red</span>
                            </Label>

                            <RadioGroupItem value="black" id="black" className="sr-only" />
                            <Label
                              htmlFor="black"
                              className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer ${
                                playerColor === 'black'
                                  ? 'border-blue-500 bg-blue-600/10'
                                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                              }`}
                            >
                              <div className="w-5 h-5 rounded-full bg-gray-800 border-2 border-gray-900" />
                              <span className="text-white text-sm">Black</span>
                            </Label>

                            <RadioGroupItem value="random" id="random" className="sr-only" />
                            <Label
                              htmlFor="random"
                              className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer ${
                                playerColor === 'random'
                                  ? 'border-blue-500 bg-blue-600/10'
                                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                              }`}
                            >
                              <span className="text-white text-sm">Random</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    {gameMode === 'bot' && (
                      <div>
                        <Label className="text-gray-300 text-sm mb-2 block">Bot Difficulty</Label>
                        <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-8 px-2 w-full">
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

                    {gameMode === 'local' && (
                      <div className="text-gray-300">
                        <p className="mb-2">Player 1: <span className="text-white font-medium">Red</span></p>
                        <p>Player 2: <span className="text-white font-medium">Black</span></p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Control Settings */}
                <div>
                  <Label className="text-white text-base mb-3 block flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Control
                  </Label>
                  <div className="bg-gray-700/30 p-4 rounded-md space-y-3">
                    <div>
                      <Label className="text-gray-300 text-sm mb-2 block">Time Control Type</Label>
                      <Select value={timeControlType} onValueChange={handleTimeControlTypeChange}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-8 px-2 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Time Control</SelectItem>
                          <SelectItem value="blitz">⚡ Blitz (5+3)</SelectItem>
                          <SelectItem value="rapid">🚀 Rapid (15+10)</SelectItem>
                          <SelectItem value="classical">🏛️ Classical (30+30)</SelectItem>
                          <SelectItem value="custom">⚙️ Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {timeControlType === 'custom' && timeControl && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-gray-300 text-xs mb-1 block">Initial Time (minutes)</Label>
                            <Select 
                              value={timeControl.initialMinutes.toString()} 
                              onValueChange={(v) => updateCustomTimeControl('initialMinutes', parseInt(v))}
                            >
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-8 px-2">
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
                            <Label className="text-gray-300 text-xs mb-1 block">Increment (seconds)</Label>
                            <Select 
                              value={timeControl.incrementSeconds.toString()} 
                              onValueChange={(v) => updateCustomTimeControl('incrementSeconds', parseInt(v))}
                            >
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-8 px-2">
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
                      <div className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
                        <strong>Preview:</strong> Each player gets {timeControl.initialMinutes} minutes
                        {timeControl.incrementSeconds && timeControl.incrementSeconds > 0 && (
                          <> + {timeControl.incrementSeconds} seconds per move</>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Action */}
                <div className="flex pt-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
        </div>
      </div>
    </div>
  );
}