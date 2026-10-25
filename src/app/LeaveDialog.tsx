import { useSyncExternalStore } from 'react';
import { Button, DialogActions, DialogContent, DialogTitle, Modal, ModalDialog, Snackbar } from '@portal-poc/ds';
import { leaveDialog } from '@/shared/platform';

const LOCK_NOTICE_MS = 4000;

const stay = () => {
  leaveDialog.answer(false);
};

const leave = () => {
  leaveDialog.answer(true);
};

/** The host's answer to leave guards of every app: one confirmation dialog, one notice when a lock refuses. */
export const LeaveDialog = () => {
  const { asking, locked } = useSyncExternalStore(leaveDialog.subscribe, leaveDialog.getSnapshot);
  return (
    <>
      <Modal open={asking !== null} onClose={stay}>
        <ModalDialog role="alertdialog" size="sm">
          <DialogTitle>Leave this page?</DialogTitle>
          <DialogContent>{asking?.message}</DialogContent>
          <DialogActions>
            <Button color="danger" onClick={leave}>
              Leave
            </Button>
            <Button variant="plain" color="neutral" onClick={stay}>
              Stay
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
      <Snackbar
        key={locked?.at}
        open={locked !== null}
        color="warning"
        variant="soft"
        autoHideDuration={LOCK_NOTICE_MS}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClose={leaveDialog.dismissLocked}
      >
        {locked?.message}
      </Snackbar>
    </>
  );
};
