'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Sparkles, Settings2, Eye } from 'lucide-react';
import Link from 'next/link';
import { findLeadsAction, findLeadsByPlaceAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  keyword1: z.string().min(2, "At least one keyword is required"),
  keyword2: z.string().optional(),
  keyword3: z.string().optional(),
  keyword4: z.string().optional(),
  keyword5: z.string().optional(),
  keyword6: z.string().optional(),
  location: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.string().optional(),
  techStack: z.string().optional(),
  useGooglePlaces: z.boolean().default(false),
});

type DiscoverLeadsDialogProps = {
  onNewLeads: () => void;
};

export function DiscoverLeadsDialog({ onNewLeads }: DiscoverLeadsDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keyword1: '',
      keyword2: '',
      keyword3: '',
      keyword4: '',
      keyword5: '',
      keyword6: '',
      location: '',
      industry: '',
      employeeCount: '',
      techStack: '',
      useGooglePlaces: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setIsOpen(false);
    toast({
      title: 'Starting Lead Discovery...',
      description: 'New leads will appear on your dashboard as they are found. You can monitor the detailed progress on the Debug page.',
    });

    const searchTerms = [
      values.keyword1,
      values.keyword2,
      values.keyword3,
      values.keyword4,
      values.keyword5,
      values.keyword6,
    ].filter(Boolean) as string[];

    try {
      let result;
      if (values.useGooglePlaces) {
        const query = [...searchTerms, values.location, values.industry].filter(Boolean).join(' ');
        result = await findLeadsByPlaceAction({ query });
      } else {
        result = await findLeadsAction({
          searchContext: searchTerms.join(', '),
          searchTerms: searchTerms,
          location: values.location || undefined,
          industry: values.industry || undefined,
          employeeCount: values.employeeCount || undefined,
          techStack: values.techStack || undefined,
        });
      }

      if (result && 'error' in result) {
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: result.error,
        });
        return;
      }

      toast({
        title: 'Lead Discovery Finished',
        description: result.message,
      });

      onNewLeads();
      form.reset();
    } catch (error: any) {
      console.error('Error finding leads:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'There was a problem initiating the lead discovery. Please check the logs and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="mr-2 h-4 w-4" /> Discover New Leads
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Discover New Leads</DialogTitle>
          <DialogDescription>
            Specify your search parameters. Leads will be added to your dashboard in real-time.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <FormLabel>Keywords (Up to 6)</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <FormField
                      key={`keyword${num}`}
                      control={form.control}
                      name={`keyword${num}` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder={`Keyword ${num}`} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Australian State</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NSW">New South Wales (NSW)</SelectItem>
                        <SelectItem value="VIC">Victoria (VIC)</SelectItem>
                        <SelectItem value="QLD">Queensland (QLD)</SelectItem>
                        <SelectItem value="WA">Western Australia (WA)</SelectItem>
                        <SelectItem value="SA">South Australia (SA)</SelectItem>
                        <SelectItem value="TAS">Tasmania (TAS)</SelectItem>
                        <SelectItem value="ACT">Australian Capital Territory (ACT)</SelectItem>
                        <SelectItem value="NT">Northern Territory (NT)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="useGooglePlaces"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Use Google Places Database</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced-search">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Settings2 className="h-4 w-4" />
                      Advanced Search
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Logistics / Shipping Industry</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an industry" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Freight Forwarding">Freight Forwarding</SelectItem>
                                <SelectItem value="Warehousing">Warehousing</SelectItem>
                                <SelectItem value="Supply Chain Management">Supply Chain Management</SelectItem>
                                <SelectItem value="Last-Mile Delivery">Last-Mile Delivery</SelectItem>
                                <SelectItem value="Maritime">Maritime</SelectItem>
                                <SelectItem value="Aviation Logistics">Aviation Logistics</SelectItem>
                                <SelectItem value="3PL">Third-Party Logistics (3PL)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="employeeCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Size (Employees)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select company size" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1-10">1-10</SelectItem>
                                <SelectItem value="11-50">11-50</SelectItem>
                                <SelectItem value="51-200">51-200</SelectItem>
                                <SelectItem value="201-500">201-500</SelectItem>
                                <SelectItem value="501-1000">501-1000</SelectItem>
                                <SelectItem value="1000+">1000+</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="techStack"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website Backend / Tech Stack</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a tech stack" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Shopify">Shopify</SelectItem>
                                <SelectItem value="WordPress">WordPress</SelectItem>
                                <SelectItem value="Magento">Magento</SelectItem>
                                <SelectItem value="WooCommerce">WooCommerce</SelectItem>
                                <SelectItem value="Custom Node.js">Custom Node.js</SelectItem>
                                <SelectItem value="React/Next.js">React / Next.js</SelectItem>
                                <SelectItem value="Salesforce">Salesforce Commerce Cloud</SelectItem>
                                <SelectItem value="BigCommerce">BigCommerce</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <DialogFooter className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link href="/debug" passHref className="w-full" target="_blank" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full">
                  <Eye className="mr-2 h-4 w-4" />
                  Monitor Progress
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Start Discovery
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
