'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Label } from '~/components/ui/label';
import { Slider } from '~/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Users, User, Bot, Globe, Settings, ChevronLeft, Trophy, Zap, Brain } from 'lucide-react';
import { api } from '~/trpc/react';

type GameMode = 'friend' | 'local' | 'bot';
type Variant = 'american' | 'brazilian' | 'international' | 'custom';
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export default function GameConfigPage() {
  const router = useRouter();
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [variant, setVariant] = useState<Variant>('american');
  const [playerColor, setPlayerColor] = useState<'red' | 'black' | 'random'>('red');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showConfig, setShowConfig] = useState(false);
  
  const createGameMutation = api.game.create.useMutation({
    onSuccess: (data) => {
      router.push(`/game/${data.id}`);
    },
  });

  const handleModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    setShowConfig(true);
  };

  const handleBack = () => {
    if (showConfig) {
      setShowConfig(false);
      setGameMode(null);
    } else {
      router.push('/');
    }
  };

  const handleCreateGame = () => {
    createGameMutation.mutate({
      mode: gameMode === 'friend' ? 'online' : gameMode === 'bot' ? 'ai' : 'local',
      playerName: undefined,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full">
        <div className="grid md:grid-cols-[1fr_400px] gap-8">
          {/* Board Preview */}
          <div className="">
            <div className="aspect-square mx-auto w-full" style={{ maxWidth: 'min(100%, calc(100vh - 2rem))' }}>
              <div className="grid grid-cols-8 gap-0 border-4 border-gray-700 rounded w-full h-full">
                {Array.from({ length: 64 }).map((_, index) => {
                  const row = Math.floor(index / 8);
                  const col = index % 8;
                  const isBlack = (row + col) % 2 === 1;
                  const hasPiece = (row < 3 || row > 4) && isBlack;
                  const isRed = row > 4;
                  
                  return (
                    <div
                      key={index}
                      className={`aspect-square flex items-center justify-center ${
                        isBlack ? 'bg-green-700' : 'bg-green-100'
                      }`}
                    >
                      {hasPiece && (
                        <div 
                          className="w-4/5 h-4/5 rounded-full shadow-xl border-4 relative"
                          style={{
                            background: isRed 
                              ? `linear-gradient(to bottom right, var(--piece-red-from), var(--piece-red-to))`
                              : `linear-gradient(to bottom right, var(--piece-black-from), var(--piece-black-to))`,
                            borderColor: isRed 
                              ? 'var(--piece-red-border)' 
                              : 'var(--piece-black-border)'
                          }}
                        >
                          <div className="absolute inset-2 rounded-full bg-gradient-to-tl from-white/20 to-transparent" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Selection or Configuration */}
          <div className="space-y-4">
            {!showConfig ? (
              <>
                <Card 
                  className="bg-gray-800/80 border-gray-700 p-6 cursor-pointer hover:bg-gray-800/90 transition-all hover:scale-[1.02]"
                  onClick={() => handleModeSelect('friend')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">Play a Friend</h3>
                      <p className="text-gray-400 text-sm">Invite a friend to a game of checkers</p>
                    </div>
                  </div>
                </Card>

                <Card 
                  className="bg-gray-800/80 border-gray-700 p-6 cursor-pointer hover:bg-gray-800/90 transition-all hover:scale-[1.02]"
                  onClick={() => handleModeSelect('local')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <User className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">Local Game</h3>
                      <p className="text-gray-400 text-sm">Play on the same device</p>
                    </div>
                  </div>
                </Card>

                <Card 
                  className="bg-gray-800/80 border-gray-700 p-6 cursor-pointer hover:bg-gray-800/90 transition-all hover:scale-[1.02]"
                  onClick={() => handleModeSelect('bot')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Bot className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">Play a Bot</h3>
                      <p className="text-gray-400 text-sm">Challenge the AI opponent</p>
                    </div>
                  </div>
                </Card>

                <div className="mt-8 pt-6 border-t border-gray-700 space-y-3">
                  <button className="w-full text-left flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                    <Trophy className="w-5 h-5" />
                    <span>Game History</span>
                  </button>
                  <button className="w-full text-left flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-gray-400 hover:text-white"
                  onClick={handleBack}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Card className="bg-gray-800/80 border-gray-700 p-6">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {gameMode === 'friend' && 'Play with a Friend'}
                      {gameMode === 'local' && 'Local Game'}
                      {gameMode === 'bot' && 'Play against Bot'}
                    </h2>
                    <p className="text-gray-400">Configure your game settings</p>
                  </div>

                  <div className="space-y-6">
                    {/* Game Variant */}
                    <div>
                      <Label className="text-white text-lg mb-4 block">Game Rules</Label>
                      <RadioGroup value={variant} onValueChange={(v) => setVariant(v as Variant)}>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-start space-x-3 bg-gray-700/50 p-3 rounded-lg">
                            <RadioGroupItem value="american" id="american" />
                            <Label htmlFor="american" className="cursor-pointer">
                              <div className="text-white font-medium text-base">American Checkers</div>
                              <div className="text-gray-400 text-xs">8×8 board, 12 pieces, kings can fly</div>
                            </Label>
                          </div>
                          
                          <div className="flex items-start space-x-3 bg-gray-700/50 p-3 rounded-lg">
                            <RadioGroupItem value="international" id="international" />
                            <Label htmlFor="international" className="cursor-pointer">
                              <div className="text-white font-medium text-base">International Draughts</div>
                              <div className="text-gray-400 text-xs">10×10 board, 20 pieces, flying kings</div>
                            </Label>
                          </div>
                          
                          <div className="flex items-start space-x-3 bg-gray-700/50 p-3 rounded-lg">
                            <RadioGroupItem value="brazilian" id="brazilian" />
                            <Label htmlFor="brazilian" className="cursor-pointer">
                              <div className="text-white font-medium text-base">Brazilian Draughts</div>
                              <div className="text-gray-400 text-xs">8×8 board, backwards capture allowed</div>
                            </Label>
                          </div>
                          
                          <div className="flex items-start space-x-3 bg-gray-700/50 p-3 rounded-lg">
                            <RadioGroupItem value="custom" id="custom" />
                            <Label htmlFor="custom" className="cursor-pointer">
                              <div className="text-white font-medium text-base">Custom Rules</div>
                              <div className="text-gray-400 text-xs">Configure individual rule settings</div>
                            </Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Custom Rules (shown when custom is selected) */}
                    {variant === 'custom' && (
                      <div className="bg-gray-700/30 p-6 rounded-lg space-y-4">
                        <h3 className="text-white font-medium mb-4">Custom Rule Settings</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-300">Board Size</Label>
                            <Select defaultValue="8">
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="8">8×8</SelectItem>
                                <SelectItem value="10">10×10</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-gray-300">Piece Count</Label>
                            <Select defaultValue="12">
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="12">12 pieces</SelectItem>
                                <SelectItem value="20">20 pieces</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-gray-300">
                            <input type="checkbox" className="rounded" defaultChecked />
                            <span>Mandatory captures</span>
                          </label>
                          <label className="flex items-center space-x-2 text-gray-300">
                            <input type="checkbox" className="rounded" />
                            <span>Backwards capture for regular pieces</span>
                          </label>
                          <label className="flex items-center space-x-2 text-gray-300">
                            <input type="checkbox" className="rounded" defaultChecked />
                            <span>Flying kings</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Player Settings */}
                    <div>
                      <Label className="text-white text-lg mb-4 block">Player Settings</Label>
                      <div className="bg-gray-700/30 p-6 rounded-lg space-y-4">
                        {gameMode !== 'local' && (
                          <div>
                            <Label className="text-gray-300 mb-2 block">Your Color</Label>
                            <RadioGroup value={playerColor} onValueChange={(v) => setPlayerColor(v as any)}>
                              <div className="flex gap-3">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="red" id="red" />
                                  <Label htmlFor="red" className="cursor-pointer flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-red-600 border-2 border-red-700" />
                                    <span className="text-white text-sm">Red</span>
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="black" id="black" />
                                  <Label htmlFor="black" className="cursor-pointer flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-gray-800 border-2 border-gray-900" />
                                    <span className="text-white text-sm">Black</span>
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="random" id="random" />
                                  <Label htmlFor="random" className="cursor-pointer text-white text-sm">
                                    <span>Random</span>
                                  </Label>
                                </div>
                              </div>
                            </RadioGroup>
                          </div>
                        )}

                        {gameMode === 'bot' && (
                          <div>
                            <Label className="text-gray-300 mb-3 block">Bot Difficulty</Label>
                            <div className="grid grid-cols-4 gap-2">
                              {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((diff) => (
                                <button
                                  key={diff}
                                  onClick={() => setDifficulty(diff)}
                                  className={`p-2 rounded-lg border-2 transition-all ${
                                    difficulty === diff
                                      ? 'bg-blue-600/20 border-blue-500 text-white'
                                      : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'
                                  }`}
                                >
                                  <div className="text-xl mb-1">{getDifficultyIcon(diff)}</div>
                                  <div className="text-xs capitalize">{diff}</div>
                                </button>
                              ))}
                            </div>
                            {difficulty === 'expert' && (
                              <p className="text-yellow-400 text-sm mt-2">
                                ⚠️ Expert AI is very challenging!
                              </p>
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

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
                        onClick={handleBack}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}