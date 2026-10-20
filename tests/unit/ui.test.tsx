import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { Input } from '@/shared/ui';
import { DialogHost, showDialog } from '@/shared/ui/dialog';
import { act } from 'react';

describe('controles web acessíveis', () => {
  test('associa rótulo e mensagem de validação ao campo', () => {
    render(<Input label="E-mail" error="Informe um e-mail válido." keyboardType="email-address" />);
    const field = screen.getByLabelText('E-mail');
    expect(field).toHaveAttribute('type', 'email');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Informe um e-mail válido.');
  });
  test('abre confirmação e devolve foco ao botão após cancelar', () => {
    // jsdom does not implement the native dialog API.
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
    const confirm = vi.fn();
    render(
      <>
        <button
          onClick={() =>
            showDialog('Cancelar reserva', 'Confirma esta ação?', [
              { text: 'Voltar', style: 'cancel' },
              { text: 'Confirmar', onClick: confirm },
            ])
          }
        >
          Cancelar
        </button>
        <DialogHost />
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Cancelar' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Cancelar reserva');
    expect(screen.getByRole('button', { name: 'Voltar' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(confirm).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    act(() => showDialog('Confirmar', 'Continue', [{ text: 'Confirmar', onClick: confirm }]));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(confirm).toHaveBeenCalledOnce();
  });
});
