import { initialState, parseLoadEvent, reduce } from './loading';

class Progress {
  state = $state.raw(initialState);
}

export const progress = new Progress();

window.addEventListener('message', (event: MessageEvent) => {
  const loadEvent = parseLoadEvent(event.data);
  if (!loadEvent) return;

  progress.state = reduce(progress.state, loadEvent);
});
