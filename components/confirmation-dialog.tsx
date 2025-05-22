"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ConfirmationDialogProps {
  title: string
  description: string
  onConfirm: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}

export function ConfirmationDialog({
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
}: ConfirmationDialogProps) {
  const [isOpen, setIsOpen] = useState(true)

  const handleConfirm = useCallback(() => {
    setIsOpen(false)
    onConfirm()
  }, [onConfirm])

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    if (onCancel) {
      onCancel()
    }
  }, [onCancel])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isDestructive && <AlertTriangle className="h-6 w-6 text-destructive" />}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            className={!isDestructive ? "bg-[#00ae98] hover:bg-[#009a86]" : ""}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function useConfirmationDialog({
  title,
  description,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  isDestructive,
}: ConfirmationDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const openDialog = useCallback(() => {
    setIsDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false)
  }, [])

  const DialogComponent = useCallback(
    () =>
      isDialogOpen ? (
        <ConfirmationDialog
          title={title}
          description={description}
          onConfirm={() => {
            closeDialog()
            onConfirm()
          }}
          onCancel={() => {
            closeDialog()
            if (onCancel) onCancel()
          }}
          confirmText={confirmText}
          cancelText={cancelText}
          isDestructive={isDestructive}
        />
      ) : null,
    [isDialogOpen, title, description, onConfirm, onCancel, confirmText, cancelText, isDestructive, closeDialog],
  )

  return { openDialog, closeDialog, DialogComponent }
}
