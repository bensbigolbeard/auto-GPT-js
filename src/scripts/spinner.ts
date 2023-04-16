class Spinner {
  spinner: string[];
  delay: number;
  message: string;
  running: boolean;
  spinnerThread: null;
  spinnerIndex: number;
  /**
   * A simple spinner class
   * @param {string} message - The message to display while the spinner is spinning
   * @param {number} delay - The delay between each spinner frame
   */
  constructor(message = "Loading...", delay = 250) {
    this.spinner = ["-", "/", "|", "\\"];
    this.delay = delay;
    this.message = message;
    this.running = false;
    this.spinnerThread = null;
    this.spinnerIndex = 0;
  }

  /**
   * Spin the spinner
   */
  spin() {
    const iteration = () => {
      process.stdout.write(`${this.spinner[this.spinnerIndex]} ${this.message}\r`);

      setTimeout(() => {
        process.stdout.write("\r" + " ".repeat(this.message.length + 2) + "\r");
        this.spinnerIndex++;
        if (this.spinnerIndex === this.spinner.length - 1) {
          this.spinnerIndex = 0;
        }
        if (this.running) {
          iteration();
        }
      }, this.delay);
    };
  }

  /**
   * Start the spinner
   */
  start() {
    this.running = true;

    this.spin();
  }

  /**
   * Stop the spinner
   */
  stop() {
    this.running = false;
    process.stdout.write("\r" + " ".repeat(this.message.length + 2) + "\r");
    process.stdout.write("\n");
  }

  awaitWithSpinner<T>(promise: Promise<T>) {
    this.start();
    return promise.then((result) => {
      this.stop();
      return result;
    });
  }
}

export { Spinner };
