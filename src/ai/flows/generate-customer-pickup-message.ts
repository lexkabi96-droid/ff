'use server';
/**
 * @fileOverview A Genkit flow to generate personalized pickup messages for customers.
 *
 * - generateCustomerPickupMessage - A function that handles the message generation process.
 * - GenerateCustomerPickupMessageInput - The input type for the generateCustomerPickupMessage function.
 * - GenerateCustomerPickupMessageOutput - The return type for the generateCustomerPickupMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCustomerPickupMessageInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  pickupDate: z.string().describe('The date of the laundry pickup (e.g., "Tomorrow, March 10th").'),
  pickupTime: z.string().describe('The time of the laundry pickup (e.g., "between 9 AM and 11 AM").'),
  pickupLocation: z.string().describe('The location for the laundry pickup.'),
  messagePurpose: z
    .enum(['schedule', 'reminder', 'service_update'])
    .describe('The purpose of the message: schedule, reminder, or service update.'),
  additionalDetails: z
    .string()
    .optional()
    .describe('Any additional details or specific instructions for the message.'),
});
export type GenerateCustomerPickupMessageInput = z.infer<
  typeof GenerateCustomerPickupMessageInputSchema
>;

const GenerateCustomerPickupMessageOutputSchema = z.object({
  message: z.string().describe('The personalized message generated for the customer.'),
});
export type GenerateCustomerPickupMessageOutput = z.infer<
  typeof GenerateCustomerPickupMessageOutputSchema
>;

export async function generateCustomerPickupMessage(
  input: GenerateCustomerPickupMessageInput
): Promise<GenerateCustomerPickupMessageOutput> {
  return generateCustomerPickupMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCustomerPickupMessagePrompt',
  input: {schema: GenerateCustomerPickupMessageInputSchema},
  output: {schema: GenerateCustomerPickupMessageOutputSchema},
  prompt: `You are an AI assistant helping a laundry staff member draft personalized messages for customers.
Based on the provided details, generate a concise, polite, and informative message for the customer.
The message should directly address the customer and clearly convey the purpose.

Customer Name: {{{customerName}}}
Pickup Date: {{{pickupDate}}}
Pickup Time: {{{pickupTime}}}
Pickup Location: {{{pickupLocation}}}
Message Purpose: {{{messagePurpose}}}
{{#if additionalDetails}}Additional Details: {{{additionalDetails}}}{{/if}}

Please draft the message in JSON format with a single field 'message':
'json
{
  "message": "Generated message goes here."
}
'
`,
});

const generateCustomerPickupMessageFlow = ai.defineFlow(
  {
    name: 'generateCustomerPickupMessageFlow',
    inputSchema: GenerateCustomerPickupMessageInputSchema,
    outputSchema: GenerateCustomerPickupMessageOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
