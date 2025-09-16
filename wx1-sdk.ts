/**
 * Webex Contact Center SDK Component
 * LitElement-based web component for Webex CC agent functionality
 */
import { LitElement, html, css } from "lit";
import { customElement, property, query, state } from "lit/decorators.js"
import Webex, { type ITask } from '@webex/contact-center'

// Unique logging prefix for easy console filtering
const LOG_PREFIX = '[WX1-SDK]';

// Logging utility with unique keys for filtering - matches crm-app.js pattern
const Logger = {
    info: (key: string, message: string, data: any = null) => {
        const timestamp = new Date().toISOString();
        console.log(`${LOG_PREFIX}[INFO][${key}] ${timestamp} - ${message}`, data || '');
    },
    warn: (key: string, message: string, data: any = null) => {
        const timestamp = new Date().toISOString();
        console.warn(`${LOG_PREFIX}[WARN][${key}] ${timestamp} - ${message}`, data || '');
    },
    error: (key: string, message: string, error: any = null) => {
        const timestamp = new Date().toISOString();
        console.error(`${LOG_PREFIX}[ERROR][${key}] ${timestamp} - ${message}`, error || '');
    },
    debug: (key: string, message: string, data: any = null) => {
        const timestamp = new Date().toISOString();
        console.log(`${LOG_PREFIX}[DEBUG][${key}] ${timestamp} - ${message}`, data || '');
    },
    webex: (key: string, action: string, data: any = null) => {
        const timestamp = new Date().toISOString();
        console.log(`${LOG_PREFIX}[WEBEX][${key}] ${timestamp} - ${action}`, data || '');
    }
};

@customElement("wx1-sdk")
export class Wx1Sdk extends LitElement {
    // Public properties
    @property({ reflect: true }) accesstoken = ""
    
    // Component state
    @state() teams = []
    @state() agentName = ""
    @state() ani = ""
    @state() voiceOptions = []
    @state() idleCodes = []
    @state() wrapupCodes = []
    @state() agentLogin = { dialNumber: '', teamId: '', loginOption: 'BROWSER' }
    @state() profile: any
    @state() station: any
    @state() loggedIn: boolean = false
    @state() task: any
    @state() tControls: any
    @state() cad: any
    
    // DOM references
    @query('#selectIdleCode') idleCode: any
    private webex: any;
    static styles = [
        css`
    :host {
        display: block;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        border: 1px solid #e1e5e9;
        border-radius: 12px;
        max-width: 450px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        margin: 10px;
    }

    .status {
        color: #0078d4;
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 8px;
    }

    label {
        display: block;
        font-weight: 500;
        color: #2c3e50;
        margin-bottom: 5px;
        margin-top: 12px;
        font-size: 13px;
    }

    input, select {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e1e5e9;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        transition: all 0.3s ease;
        margin-bottom: 8px;
        box-sizing: border-box;
    }

    input:focus, select:focus {
        outline: none;
        border-color: #0078d4;
        box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.1);
    }

    button {
        background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        margin: 5px 5px 5px 0;
        box-shadow: 0 2px 8px rgba(0, 120, 212, 0.2);
    }

    button:hover {
        background: linear-gradient(135deg, #106ebe 0%, #005a9e 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3);
    }

    button:active {
        transform: translateY(0);
        box-shadow: 0 2px 6px rgba(0, 120, 212, 0.2);
    }

    /* Logout button styling */
    button[onclick*="stationLogout"] {
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.2);
    }

    button[onclick*="stationLogout"]:hover {
        background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    }

    /* Task control buttons */
    button[onclick*="hold"] {
        background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
        color: #212529;
        box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
    }

    button[onclick*="resume"] {
        background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
        box-shadow: 0 2px 8px rgba(40, 167, 69, 0.2);
    }

    button[onclick*="end"] {
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.2);
    }

    p {
        margin: 8px 0;
        color: #2c3e50;
        line-height: 1.5;
    }

    p strong {
        color: #0078d4;
        font-weight: 600;
    }

    br {
        line-height: 1.8;
    }

    /* Welcome message styling */
    p:has(strong) {
        background: rgba(0, 120, 212, 0.1);
        padding: 12px;
        border-radius: 6px;
        border-left: 4px solid #0078d4;
        font-weight: 500;
    }

    /* CAD (Call Associated Details) styling */
    div:last-child p {
        background: #f8f9fa;
        padding: 8px 12px;
        border-radius: 4px;
        margin: 4px 0;
        font-size: 13px;
        border-left: 3px solid #0078d4;
    }

    /* Loading states */
    :host([loading]) {
        opacity: 0.7;
        pointer-events: none;
    }

    /* Responsive design */
    @media (max-width: 480px) {
        :host {
            max-width: 100%;
            margin: 5px;
            padding: 15px;
        }
        
        button {
            width: 100%;
            margin: 5px 0;
        }
        
        input, select {
            font-size: 16px; /* Prevents zoom on iOS */
        }
    }
        `
    ];


    /**
     * Initialize Webex SDK connection with access token
     */
    startConnection() {
        this.webex = new Webex({
            credentials: {
                access_token: this.accesstoken,
                allowMultiLogin: true
            }
        });
        new Promise((resolve) => {
            this.webex.once('ready', async () => {
                Logger.info('SDK-INIT', 'Webex SDK initialized with OAuth token');

                this.profile = await this.webex.cc.register()
                this.getOptions()
                resolve;
            });
        });

    }

    /**
     * Setup agent options and event listeners after registration
     */
    getOptions() {
        // console.log(JSON.stringify(this.profile))
        this.voiceOptions = this.profile.loginVoiceOptions.map((item: any) => html`<option value=${item}>${item}</option>`)
        this.teams = this.profile.teams.map((item: any) => html`<option value=${item.id}>${item.name}</option>`)
        this.agentName = this.profile.agentName
        this.idleCodes = this.profile.idleCodes.filter((item: any) => !item.isSystem).map((item: any) => html`<option value=${item.id}>${item.name}</option>`)
        this.wrapupCodes = this.profile.wrapupCodes.filter((item: any) => !item.isSystem).map((item: any) => html`<option value=${item.id}>${item.name}</option>`)
        this.webex.cc.on("AgentStateChangeSuccess", (event: any) => {
            // console.log(event)
            this.idleCode.value = event.auxCodeId
        });
        this.webex.cc.on("task:incoming", (task: ITask) => {

            Logger.webex('TASK-INCOMING', 'New incoming task received', { 
                taskUuid: (task as any).uuid, 
                ani: (task.data as any)?.interaction?.callAssociatedDetails?.ani 
            });
            this.task = task
            this.cad = Object.entries(this.task.data.interaction.callAssociatedDetails).map(([key, value]) => { return html`<p>${key}: ${value}</p>` })
            
            this.ani = this.task.data.interaction.callAssociatedDetails.ani
            Logger.debug('ANI-EXTRACT', 'Extracted ANI from task', { ani: this.ani });
            // Call CRM app's searchCustomers function dynamically
            this.callCrmSearch(this.ani);
            
            this.tControls = html`<button @click=${this.actionTask.bind(this, 'hold')}>Hold</button><button @click=${this.actionTask.bind(this, 'resume')}>Resume</button><button @click=${this.actionTask.bind(this, 'end')}>End</button>`
            this.task.once("task:end", (task: ITask) => {
                Logger.webex('TASK-END', 'Task ended', { taskUuid: (task as any).uuid });
                // alert(`end ${JSON.stringify(task)}`)
                this.tControls = html`<select @change=${(e: any) => this.handleWrapupSelection(e)}>
                    <option value="">Select wrap-up reason...</option>
                    ${this.task.wrapupData.wrapUpProps.wrapUpReasonList.map((i:any)=>{return html`<option value=${i.id} data-name=${i.name}>${i.name}</option>`})}
                </select>`
            })
          
            this.task.on("task:wrappedup", (task: ITask) => {
                alert("wrapped up click ok")
                this.task = null
                this.tControls = null
                this.cad = null
            })

        })

    }

    /**
     * Handle task actions (hold, resume, end, wrapup)
     */
    async actionTask(action: string, aux1:string, aux2:string) {
        Logger.webex('TASK-ACTION', `Task action triggered: ${action}`, { action, aux1, aux2 });
        switch (action) {
            case "end": {
                this.task.end()
                break
            }
            case "hold": {
                this.task.hold()
                break
            }
            case "resume": {
                this.task.resume()
                break
            }
            case "wrapup":{
                this.task.wrapup({
                    wrapUpReason:`${aux2}`,
                    auxCodeId: `${aux1}`
                })
                break
            }
        }
    }

    handleWrapupSelection(e: any) {
        const selectedValue = e.target.value;
        const selectedOption = e.target.selectedOptions[0];
        
        if (selectedValue && selectedOption) {
            const wrapupName = selectedOption.dataset.name || selectedOption.textContent;
            Logger.webex('WRAPUP-SELECT', 'Wrap-up code selected', { 
                wrapupId: selectedValue, 
                wrapupName: wrapupName 
            });
            this.actionTask("wrapup", selectedValue, wrapupName);
        }
    }

    /**
     * Search CRM for customer data using incoming call ANI
     */
    callCrmSearch(searchTerm: string) {
        try {
            // Try to access the parent window's CRM functions
            const parentWindow = window.parent as any;
            const currentWindow = window as any;
            
            // Try to access and call the searchCustomers function from crm-app.js
            if (parentWindow && parentWindow.searchCustomers && typeof parentWindow.searchCustomers === 'function') {
                Logger.info('CRM-INTEGRATION', 'Found parent window searchCustomers function');
                // Set the search input value in the parent window
                const searchInput = parentWindow.document.getElementById('search-input');
                if (searchInput) {
                    (searchInput as HTMLInputElement).value = searchTerm;
                    // Call the searchCustomers function
                    parentWindow.searchCustomers();
                    Logger.webex('CRM-SEARCH', 'Called parent window searchCustomers function', { searchTerm });
                    
                    // After calling search, get the customer data and show popup
                    setTimeout(() => {
                        Logger.debug('CRM-POPUP', 'Attempting to show customer data from CRM');
                        this.showCustomerDataFromCrm(parentWindow, searchTerm);
                    }, 500); // Wait for search to complete
                }
            } 
        } catch (error) {
            Logger.error('CRM-SEARCH', 'Error calling CRM search', error);
        }
    }

    showCustomerDataFromCrm(windowContext: any, searchTerm: string) {
        try {
            // Try multiple ways to access the customers data from the CRM
            let customers = {};
            
            // Method 1: Direct access from window
            if (windowContext.customers) {
                Logger.debug('CRM-DATA', 'Method 1: Found customers in windowContext');
                customers = windowContext.customers;
            }
            else {
                Logger.debug('CRM-DATA', 'No customers found in windowContext');
            }
            
            Logger.debug('CRM-DATA', 'Found customers in CRM', { 
                customerCount: Object.keys(customers).length 
            });

            // Find customer matching the search term
            let foundCustomer = null;
            for (const customerId in customers) {
                const customer = customers[customerId];
                Logger.debug('CRM-SEARCH', 'Checking customer', { 
                    customerId, 
                    customerName: customer?.firstName + ' ' + customer?.lastName 
                });
                if (customer && customer.firstName && customer.lastName &&
                    (customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (customer.phone && customer.phone.includes(searchTerm)) ||
                    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())))) {
                    foundCustomer = customer;
                    Logger.info('CRM-MATCH', 'Found matching customer', { 
                        customerName: foundCustomer.firstName + ' ' + foundCustomer.lastName,
                        searchTerm 
                    });
                    break;
                }
            }
            
            if (foundCustomer) {
                this.createCustomerPopup(foundCustomer, 'Customer Found in CRM');
            } else {
                Logger.warn('CRM-NO-MATCH', 'No matching customer found', { 
                    searchTerm,
                    availableCustomers: Object.keys(customers)
                });
            }
        } catch (error) {
            Logger.error('CRM-DATA', 'Error accessing CRM customer data', error);
        }
    }

    /**
     * Display customer information popup when match found
     */
    createCustomerPopup(customer: any, title: string) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Create popup content
        const popup = document.createElement('div');
        popup.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        popup.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #2c3e50;">📞 ${title}</h2>
                <button onclick="this.closest('.popup-overlay').remove()" 
                        style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 15px; line-height: 1.6;">
                <div><strong>Customer ID:</strong></div>
                <div>${customer.id}</div>
                
                <div><strong>Name:</strong></div>
                <div>${customer.firstName} ${customer.lastName}</div>
                
                <div><strong>Phone:</strong></div>
                <div style="color: #007bff; font-weight: bold;">${customer.phone}</div>
                
                <div><strong>Email:</strong></div>
                <div>${customer.email}</div>
                
                <div><strong>Address:</strong></div>
                <div>${customer.address}</div>
                
                <div><strong>Date of Birth:</strong></div>
                <div>${customer.dob}</div>
                
                <div><strong>Member Since:</strong></div>
                <div>${customer.memberSince}</div>
                
                <div><strong>Notes:</strong></div>
                <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; border-left: 4px solid #007bff;">
                    ${customer.notes}
                </div>
            </div>
            
        `;
        
        overlay.className = 'popup-overlay';
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        Logger.info('CRM-POPUP', 'Customer popup displayed', { 
            customerName: customer.firstName + ' ' + customer.lastName 
        });
        
        // Close popup when clicking overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        // Auto-close after 15 seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
                Logger.debug('CRM-POPUP', 'Customer popup auto-closed');
            }
        }, 15000);
    }

    /**
     * Login agent to Webex Contact Center station
     */
    async stationLogin() {
        this.webex.cc.on('agent:stationLoginSuccess', (eventData: any) => {
            Logger.info('STATION-LOGIN', 'Station login successful via event', eventData);
        })
        this.station = await this.webex.cc.stationLogin(this.agentLogin)
        this.loggedIn = true

        // start listeners here


    }
    /**
     * Logout agent and cleanup session
     */
    async stationLogout() {
        try {
            await this.webex.cc.stationLogout({ logoutReason: 'End of shift' })
            Logger.info('STATION-LOGOUT', 'Logged out successfully');
            this.loggedIn = false
            await this.webex.cc.deregister()
            this.profile = null
        } catch (error) {
            Logger.error('STATION-LOGOUT', 'Logout failed', error);
        }
    }
    
    /**
     * Change agent availability status (Available/Idle)
     */
    async changeStatus(e: any) {
        let targetState
        if (e.target.value != "0") { targetState = "Idle" } else { targetState = "Available" }
        try {
            const response = await this.webex.cc.setAgentState({
                state: targetState,          // e.g., "Idle"
                auxCodeId: e.target.value,//targetAuxCodeId,    // e.g., "auxCodeIdForLunch"
                lastStateChangeReason: 'User Initiated'
            });
            Logger.info('AGENT-STATE', 'State set successfully', { 
                targetState, 
                auxCodeId: e.target.value 
            });
            // The agent's state is now updated on the backend.
            return response;
        } catch (error) {
            Logger.error('AGENT-STATE', 'Failed to set state', error);
            throw error;
        }

    }
    render() {
        return html`
      <div>

        
        <!--  Implement choose here -->
        <!-- Login -->
        ${!this.profile ? html`
        <label>Access Token: </label><input @change=${(e: any) => this.accesstoken = e.target.value} id="token" aria-label="Token"><br>
        <button @click=${this.startConnection}>start</button>` : html``}

       <!-- select station options -->
       ${this.profile && !this.loggedIn ? html`<p>Welcome ${this.profile.agentName}</p>
            <label>Handle calls using</label>
            <select @change=${(e: any) => this.agentLogin = { ...this.agentLogin, loginOption: e.target.selectedOptions[0].value }} id="selectVoiceOption">
                <option></option>
                ${this.voiceOptions}
            </select><br>
            <label>Your team</label>
            <select @change=${(e: any) => this.agentLogin.teamId = e.target.selectedOptions[0].value} id="selectTeam">
                <option></option>
                ${this.teams}
            </select><br>
            ${this.agentLogin.loginOption != 'BROWSER' ? html`<label>${this.agentLogin.loginOption}: </label><input @change=${(e: any) => this.agentLogin.dialNumber = e.target.value}><br>` : html``}
            <button @click=${this.stationLogin}>Login</button>
            `: html``}

            <!-- logged in  -->
           ${this.loggedIn ? html`
            <p>Logged in as: <strong>${this.agentName}</strong></p>
            <button @click=${this.stationLogout}>Logout</button>
            <select id="selectIdleCode" @change=${this.changeStatus}>
            ${this.idleCodes}
            </select>
            ${this.cad}<br>
            ${this.tControls}
            ` : html``} 


        </div>
            `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "wx1-sdk": Wx1Sdk;
    }
}
