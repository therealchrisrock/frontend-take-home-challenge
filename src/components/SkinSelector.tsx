'use client';

import { useState } from 'react';
import { useSkin } from '~/lib/skins/skin-context';
import { cn } from '~/lib/utils';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Palette, Lock, Unlock, Trophy, Target, ShoppingBag, Code, Gamepad2 } from 'lucide-react';

export function SkinSelector() {
  const { 
    currentSkin, 
    availableSkins, 
    unlockedSkins, 
    selectSkin, 
    skinProgress,
    checkUnlockCondition,
    unlockSkin 
  } = useSkin();
  
  const [selectedPreview, setSelectedPreview] = useState(currentSkin.id);
  const [codeInput, setCodeInput] = useState('');
  const [showCodeInput, setShowCodeInput] = useState<string | null>(null);

  const handleSelectSkin = (skinId: string) => {
    if (unlockedSkins.has(skinId)) {
      selectSkin(skinId);
      setSelectedPreview(skinId);
    }
  };

  const handleCodeSubmit = (skinId: string) => {
    checkUnlockCondition(skinId, 'code', codeInput.toUpperCase());
    setCodeInput('');
    setShowCodeInput(null);
  };

  const getUnlockIcon = (type: string) => {
    switch (type) {
      case 'wins': return <Trophy className="w-4 h-4" />;
      case 'games': return <Gamepad2 className="w-4 h-4" />;
      case 'streak': return <Target className="w-4 h-4" />;
      case 'purchase': return <ShoppingBag className="w-4 h-4" />;
      case 'achievement': return <Trophy className="w-4 h-4" />;
      case 'code': return <Code className="w-4 h-4" />;
      default: return <Lock className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'classic': return 'bg-amber-500/10 text-amber-700';
      case 'modern': return 'bg-blue-500/10 text-blue-700';
      case 'seasonal': return 'bg-green-500/10 text-green-700';
      case 'premium': return 'bg-purple-500/10 text-purple-700';
      case 'special': return 'bg-pink-500/10 text-pink-700';
      default: return 'bg-gray-500/10 text-gray-700';
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Palette className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Board Skins</DialogTitle>
          <DialogDescription>
            Unlock and select different board skins to customize your game experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {availableSkins.map((skin) => {
            const isUnlocked = unlockedSkins.has(skin.id);
            const isSelected = currentSkin.id === skin.id;
            const isPreviewing = selectedPreview === skin.id;
            const progress = skinProgress.get(skin.id);
            
            return (
              <Card
                key={skin.id}
                className={cn(
                  'relative p-4 cursor-pointer transition-all hover:scale-105',
                  isSelected && 'ring-2 ring-primary',
                  !isUnlocked && 'opacity-75'
                )}
                onClick={() => isUnlocked && handleSelectSkin(skin.id)}
              >
                {/* Lock Overlay */}
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                
                {/* Skin Preview */}
                <div className="text-4xl text-center mb-2">{skin.preview}</div>
                
                {/* Skin Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{skin.name}</h3>
                    {isSelected && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{skin.description}</p>
                  
                  <Badge className={cn('text-xs', getCategoryColor(skin.category))}>
                    {skin.category}
                  </Badge>
                  
                  {/* Unlock Progress */}
                  {!isUnlocked && skin.unlockCondition && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        {getUnlockIcon(skin.unlockCondition.type)}
                        <span className="text-muted-foreground">
                          {skin.unlockCondition.description}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      {progress && progress.target > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{progress.progress}/{progress.target}</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ 
                                width: `${Math.min(100, (progress.progress / progress.target) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Code Input */}
                      {skin.unlockCondition.type === 'code' && (
                        <div className="space-y-2">
                          {showCodeInput === skin.id ? (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Enter code"
                                value={codeInput}
                                onChange={(e) => setCodeInput(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCodeSubmit(skin.id);
                                  }
                                }}
                                className="text-xs h-8"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleCodeSubmit(skin.id)}
                                className="h-8"
                              >
                                Submit
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowCodeInput(skin.id);
                              }}
                              className="w-full h-8 text-xs"
                            >
                              Enter Code
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Unlocked Status */}
                  {isUnlocked && !isSelected && (
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <Unlock className="w-3 h-3" />
                      <span>Unlocked</span>
                    </div>
                  )}
                </div>
                
                {/* Color Preview */}
                <div className="grid grid-cols-4 gap-1 mt-3">
                  <div 
                    className="aspect-square rounded"
                    style={{ 
                      background: `linear-gradient(to br, ${skin.board.lightSquare.from}, ${skin.board.lightSquare.to})` 
                    }}
                  />
                  <div 
                    className="aspect-square rounded"
                    style={{ 
                      background: `linear-gradient(to br, ${skin.board.darkSquare.from}, ${skin.board.darkSquare.to})` 
                    }}
                  />
                  <div 
                    className="aspect-square rounded"
                    style={{ 
                      background: `linear-gradient(to br, ${skin.pieces.red.gradient.from}, ${skin.pieces.red.gradient.to})` 
                    }}
                  />
                  <div 
                    className="aspect-square rounded"
                    style={{ 
                      background: `linear-gradient(to br, ${skin.pieces.black.gradient.from}, ${skin.pieces.black.gradient.to})` 
                    }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}