/**
 * Type declarations for the `africastalking` npm package.
 *
 * Only the SMS sub-module is typed here because that's the only API surface
 * MitaSafi currently uses. Extend as needed for USSD, Voice, etc.
 */
declare module "africastalking" {
  interface ATRecipient {
    statusCode: number;
    number: string;
    status: string;
    cost: string;
    messageId: string;
  }

  interface ATSMSResponse {
    SMSMessageData: {
      Message: string;
      Recipients: ATRecipient[];
    };
  }

  interface ATSMSSendOptions {
    to: string[];
    message: string;
    from?: string;
    enqueue?: boolean;
  }

  interface ATSMS {
    send(options: ATSMSSendOptions): Promise<ATSMSResponse>;
  }

  interface ATClient {
    SMS: ATSMS;
  }

  interface ATOptions {
    apiKey: string;
    username: string;
  }

  function AfricasTalking(options: ATOptions): ATClient;

  export default AfricasTalking;
}
