import { CanDeactivateFn } from '@angular/router';
import { CandidateAiTestComponent } from './candidate-ai-test.component';

export const candidateAiTestExitGuard: CanDeactivateFn<CandidateAiTestComponent> = (component) => {
  if (component && typeof component.canDeactivate === 'function') {
    return component.canDeactivate();
  }

  return true;
};
