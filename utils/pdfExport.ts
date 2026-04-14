type Html2PdfFn = () => {
  set: (options: Record<string, unknown>) => {
    from: (element: HTMLElement) => {
      save: () => Promise<void>;
    };
  };
};

const DEFAULT_EXPORT_OPTIONS: Record<string, unknown> = {
  margin: [0.5, 0.5],
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  },
  jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
  pagebreak: { mode: ['css', 'legacy', 'avoid-all'] }
};

interface ExportPdfParams {
  sourceElement: HTMLElement;
  filename: string;
  actionsClass?: string;
  includeFooter?: boolean;
  prepareElement?: (element: HTMLElement) => void | (() => void);
}

export const exportElementToPdf = async ({
  sourceElement,
  filename,
  actionsClass,
  includeFooter = true,
  prepareElement
}: ExportPdfParams): Promise<void> => {
  const html2pdf = (window as Window & { html2pdf?: Html2PdfFn }).html2pdf;
  if (!html2pdf) {
    throw new Error('html2pdf library is not loaded.');
  }

  sourceElement.classList.add('export-mode');

  const cleanupCallbacks: Array<() => void> = [];

  if (actionsClass) {
    sourceElement.querySelectorAll(`.${actionsClass}`).forEach(node => {
      const element = node as HTMLElement;
      const originalDisplay = element.style.display;
      element.style.display = 'none';
      cleanupCallbacks.push(() => {
        element.style.display = originalDisplay;
      });
    });
  }

  if (includeFooter) {
    const pageFooter = document.querySelector('footer');
    if (pageFooter) {
      const clonedFooter = pageFooter.cloneNode(true) as HTMLElement;
      clonedFooter.classList.add('export-mode');
      clonedFooter.style.marginTop = '1.5rem';
      sourceElement.appendChild(clonedFooter);
      cleanupCallbacks.push(() => clonedFooter.remove());
    }
  }

  if (prepareElement) {
    const cleanup = prepareElement(sourceElement);
    if (cleanup) cleanupCallbacks.push(cleanup);
  }

  try {
    const options = { ...DEFAULT_EXPORT_OPTIONS, filename };
    await html2pdf().set(options).from(sourceElement).save();
  } finally {
    while (cleanupCallbacks.length > 0) {
      const cleanup = cleanupCallbacks.pop();
      if (cleanup) cleanup();
    }
    sourceElement.classList.remove('export-mode');
  }
};
