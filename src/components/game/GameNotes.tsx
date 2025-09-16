"use client";

import { FileText, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { useDebounce } from "~/hooks/useDebounce";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface GameNotesProps {
  gameId: string;
  embedded?: boolean;
  className?: string;
}

export function GameNotes({ gameId, embedded = false, className }: GameNotesProps) {
  const [notes, setNotes] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch existing notes
  const { data: existingNotes, isLoading } = api.gameNotes.get.useQuery(
    { gameId },
    { enabled: !!gameId }
  );

  // Save mutation
  const saveNotesMutation = api.gameNotes.save.useMutation({
    onMutate: () => {
      setIsSaving(true);
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      setIsSaving(false);
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  // Debounced value for auto-save
  const debouncedNotes = useDebounce(notes, 1000);

  // Load existing notes
  useEffect(() => {
    if (existingNotes !== undefined) {
      setNotes(existingNotes);
    }
  }, [existingNotes]);

  // Auto-save on debounced change
  useEffect(() => {
    if (debouncedNotes && hasUnsavedChanges && !isSaving) {
      void saveNotesMutation.mutate({ gameId, content: debouncedNotes });
    }
  }, [debouncedNotes, gameId, hasUnsavedChanges, saveNotesMutation]);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    if (hasUnsavedChanges && !isSaving) {
      void saveNotesMutation.mutate({ gameId, content: notes });
    }
  }, [gameId, notes, hasUnsavedChanges, isSaving, saveNotesMutation]);

  if (isLoading) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <p className="text-sm text-muted-foreground">Loading notes...</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", embedded ? "h-full" : "", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-h-8">
          <FileText className={cn(
            "h-4 w-4 text-muted-foreground transition-opacity duration-300",
            isSaving && "animate-pulse opacity-50"
          )} />
          <span className="text-sm font-medium">Game Notes</span>
        </div>
        {hasUnsavedChanges && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isSaving}
            className="h-7 px-2"
          >
            <Save className="h-3 w-3" />
          </Button>
        )}
      </div>

      <Textarea
        ref={textareaRef}
        value={notes}
        onChange={handleNotesChange}
        placeholder="Add your notes about this game here. Notes are automatically saved as you type."
        className={cn(
          "min-h-[100px] resize-none",
          embedded ? "flex-1" : "h-[300px]"
        )}
      />

      <div className="text-xs text-muted-foreground">
        {notes.length > 0 && (
          <span>{notes.length} characters</span>
        )}
      </div>
    </div>
  );
}