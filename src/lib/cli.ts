import { Agent } from './openai/agent';
import readline from 'readline';
import chalk from 'chalk';

export class CliAgent {
  private agent: Agent;
  private rl: readline.Interface;

  constructor() {
    this.agent = new Agent({
      systemPrompt: `You are a helpful AI assistant in a CLI environment. 
You should provide clear, concise responses that work well in a terminal setting.
Be helpful and direct in your responses.`,
    });

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private printWelcome() {
    console.log(chalk.blue.bold('\n🤖 Agent1 CLI'));
    console.log(chalk.gray('Type your message and press Enter to chat with the AI.'));
    console.log(chalk.gray('Type "exit", "quit", or press Ctrl+C to quit.'));
    console.log(chalk.gray('Type "clear" to clear chat history.\n'));
  }

  private async processUserInput(input: string): Promise<boolean> {
    const trimmedInput = input.trim().toLowerCase();

    // Handle special commands
    if (trimmedInput === 'exit' || trimmedInput === 'quit') {
      console.log(chalk.yellow('Goodbye! 👋'));
      return false;
    }

    if (trimmedInput === 'clear') {
      this.agent.clearHistory();
      console.log(chalk.green('Chat history cleared.'));
      return true;
    }

    if (trimmedInput === '') {
      return true;
    }

    try {
      // Show thinking indicator
      const thinkingInterval = setInterval(() => {
        process.stdout.write(chalk.gray('.'));
      }, 500);

      const response = await this.agent.chat(input);
      
      clearInterval(thinkingInterval);
      process.stdout.write('\r' + ' '.repeat(20) + '\r'); // Clear thinking dots

      console.log(chalk.green('\n🤖 Assistant:'));
      console.log(response.content);
      console.log();
    } catch (error) {
      console.error(chalk.red('Error:'), error);
    }

    return true;
  }

  async start() {
    this.printWelcome();

    const askQuestion = () => {
      this.rl.question(chalk.blue('You: '), async (input) => {
        const shouldContinue = await this.processUserInput(input);
        
        if (shouldContinue) {
          askQuestion(); // Continue the conversation
        } else {
          this.rl.close();
        }
      });
    };

    askQuestion();

    // Handle Ctrl+C gracefully
    this.rl.on('SIGINT', () => {
      console.log(chalk.yellow('\nGoodbye! 👋'));
      process.exit(0);
    });
  }
}