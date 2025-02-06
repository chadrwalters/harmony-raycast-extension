import React, { useState, useEffect } from 'react';
import { List, Icon, Action, ActionPanel, showToast, Toast } from '@raycast/api';
import { ErrorHandler } from '../lib/errorHandler';
import { ErrorCategory } from '../types/error';

interface Shortcut {
  id: string;
  label: string;
  command: string;
}

interface State {
  shortcuts: Shortcut[];
  isLoading: boolean;
  error: Error | null;
}

export default function ShortcutManager() {
  const [state, setState] = useState<State>({
    shortcuts: [],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      // Mock loading shortcuts for testing
      const mockShortcuts: Shortcut[] = [
        { id: '1', label: 'Volume Up', command: 'volume-up' },
        { id: '2', label: 'Volume Down', command: 'volume-down' },
      ];
      setState(prev => ({
        ...prev,
        shortcuts: mockShortcuts,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));
      await ErrorHandler.handleError(error as Error, ErrorCategory.STORAGE);
    }
  };

  const handleCreateShortcut = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      // Mock creating a shortcut
      const newShortcut: Shortcut = {
        id: Date.now().toString(),
        label: 'New Shortcut',
        command: 'new-command',
      };
      setState(prev => ({
        ...prev,
        shortcuts: [...prev.shortcuts, newShortcut],
        isLoading: false,
      }));
      await showToast({
        style: Toast.Style.Success,
        title: 'Shortcut Created',
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));
      await ErrorHandler.handleError(error as Error, ErrorCategory.STORAGE);
    }
  };

  const handleDeleteShortcut = async (shortcut: Shortcut) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      setState(prev => ({
        ...prev,
        shortcuts: prev.shortcuts.filter(s => s.id !== shortcut.id),
        isLoading: false,
      }));
      await showToast({
        style: Toast.Style.Success,
        title: 'Shortcut Deleted',
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));
      await ErrorHandler.handleError(error as Error, ErrorCategory.STORAGE);
    }
  };

  if (state.error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark }}
          title="Error Occurred"
          description={state.error.message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                onAction={loadShortcuts}
                icon={{ source: Icon.ArrowClockwise }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (state.isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.CircleProgress }}
          title="Loading Shortcuts..."
        />
      </List>
    );
  }

  return (
    <List
      actions={
        <ActionPanel>
          <Action
            title="Add Shortcut"
            onAction={handleCreateShortcut}
            icon={{ source: Icon.Plus }}
          />
        </ActionPanel>
      }
    >
      {state.shortcuts.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.List }}
          title="No Shortcuts"
          description="Add a shortcut to get started"
        />
      ) : (
        state.shortcuts.map(shortcut => (
          <List.Item
            key={shortcut.id}
            title={shortcut.label}
            subtitle={shortcut.command}
            icon={{ source: Icon.List }}
            actions={
              <ActionPanel>
                <Action
                  title="Delete Shortcut"
                  onAction={() => handleDeleteShortcut(shortcut)}
                  icon={{ source: Icon.Trash }}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
